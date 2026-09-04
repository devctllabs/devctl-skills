import assert from "node:assert/strict";
import { access, mkdtemp } from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildJudgeConfig,
  caseFilterPattern,
  cleanupWorkspaces,
  EVAL_CASES,
  parseRunArgs,
  runStages,
  selectCases,
  SMOKE_CASE_IDS,
} from "../harness/run.mjs";

const TEST_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const EVAL_DIRECTORY = path.resolve(TEST_DIRECTORY, "..");

test("candidate config fixes Luna high, offline Go limits, and fourteen deterministic cases", () => {
  const config = readFileSync(path.join(EVAL_DIRECTORY, "promptfooconfig.yaml"), "utf8");
  const layerCases = readFileSync(
    path.join(EVAL_DIRECTORY, "cases", "layer-implementations.yaml"),
    "utf8",
  );
  const layoutCases = readFileSync(
    path.join(EVAL_DIRECTORY, "cases", "new-application-layout.yaml"),
    "utf8",
  );
  const runtimeCases = readFileSync(
    path.join(EVAL_DIRECTORY, "cases", "lifecycle-health-runtime.yaml"),
    "utf8",
  );
  const verticalCases = readFileSync(
    path.join(EVAL_DIRECTORY, "cases", "outside-in-cli-filesystem.yaml"),
    "utf8",
  );
  const cases = [layerCases, layoutCases, runtimeCases, verticalCases].join("\n");

  assert.match(config, /model:\s+gpt-5\.6-luna/);
  assert.match(config, /model_reasoning_effort:\s+high/);
  assert.match(config, /network_access_enabled:\s+false/);
  assert.match(config, /GOFLAGS:\s+"-mod=readonly -p=1"/);
  assert.match(config, /GOMAXPROCS:\s+"2"/);
  assert.match(config, /maxConcurrency:\s+3/);
  assert.equal(cases.match(/^\s+caseId:/gm)?.length, 14);
  assert.doesNotMatch(cases, /type:\s+agent-rubric/);
  assert.doesNotMatch(cases, /skill(?:'s)? TDD process|using .*TDD/i);
  for (const [caseId, evalCase] of EVAL_CASES) {
    assert.match(cases, new RegExp(`caseId:\\s+${caseId}(?:\\s|$)`));
    assert.ok(cases.includes(`description: ${evalCase.description}`));
  }

  const block = (source, caseId) => {
    const start = source.indexOf(`caseId: ${caseId}`);
    const end = source.indexOf("\n- description:", start);
    return source.slice(start, end < 0 ? source.length : end);
  };
  assert.ok(
    block(layerCases, "service-start-run").includes(
      "'type\\s+Service\\s+struct'",
    ),
  );
  assert.ok(
    block(layerCases, "repository-run-store").includes(
      "'type\\s+[A-Z]\\w*Repo\\s+struct'",
    ),
  );
  assert.ok(
    block(layerCases, "usecase-dispatch-run").includes(
      "'type\\s+[A-Z]\\w*Uc\\s+struct'",
    ),
  );
  const vertical = block(verticalCases, "outside-in-cli-filesystem");
  assert.ok(vertical.includes("'type\\s+Service\\s+struct'"));
  assert.ok(vertical.includes("'type\\s+[A-Z]\\w*Repo\\s+struct'"));

  for (const caseId of [
    "usecase-dispatch-run",
    "transport-http-start-run",
    "transport-grpc-start-run",
    "kafka-run-consumer",
  ]) {
    assert.match(
      block(layerCases, caseId),
      /forbiddenContentRegexes: \[internal\/\(service\|/,
    );
  }

  const requests = [...cases.matchAll(/\n    request: \|\n([\s\S]*?)(?=\n    fixtureDir:)/g)]
    .map((match) => match[1])
    .join("\n");
  assert.doesNotMatch(requests, /FilesystemRepo|DispatchUc|type Service struct/);
});

test("parses full and targeted commands", () => {
  assert.deepEqual(parseRunArgs(["all"]), {
    command: "all",
    maxConcurrency: 3,
    caseIds: [],
    withJudge: false,
  });
  assert.deepEqual(
    parseRunArgs([
      "cases",
      ...SMOKE_CASE_IDS,
      "--with-judge",
      "--max-concurrency",
      "4",
    ]),
    {
      command: "cases",
      maxConcurrency: 4,
      caseIds: SMOKE_CASE_IDS,
      withJudge: true,
    },
  );
  assert.throws(() => parseRunArgs(["cases"]), /Usage: run\.mjs all/);
  assert.throws(() => parseRunArgs(["cases", "missing"]), /Unknown case ID: missing/);
  assert.throws(
    () => parseRunArgs(["cases", "service-start-run", "service-start-run"]),
    /Usage: run\.mjs all/,
  );
  assert.throws(() => parseRunArgs(["all", "--with-judge"]), /Usage: run\.mjs all/);
});

test("selects the agreed smoke cases and creates an exact filter", () => {
  assert.equal(EVAL_CASES.size, 14);
  const selected = selectCases(SMOKE_CASE_IDS);
  assert.deepEqual(selected.map((item) => item.id), SMOKE_CASE_IDS);

  const filter = new RegExp(caseFilterPattern(selected));
  for (const item of selected) {
    assert.equal(filter.test(item.description), true);
  }
  assert.equal(filter.test(`prefix ${selected[0].description}`), false);
  assert.throws(() => caseFilterPattern([]), /At least one case/);
});

test("does not start reviewers after deterministic failure or when not requested", async () => {
  const failedCalls = [];
  const failed = await runStages(
    async () => {
      failedCalls.push("candidate");
      return { exitCode: 100, rows: [] };
    },
    async () => {
      failedCalls.push("reviewer");
      return 0;
    },
    true,
  );
  assert.equal(failed, 100);
  assert.deepEqual(failedCalls, ["candidate"]);

  const targetedCalls = [];
  const targeted = await runStages(
    async () => {
      targetedCalls.push("candidate");
      return { exitCode: 0, rows: [] };
    },
    async () => {
      targetedCalls.push("reviewer");
      return 0;
    },
    false,
  );
  assert.equal(targeted, 0);
  assert.deepEqual(targetedCalls, ["candidate"]);
});

function candidateRow(caseId, index) {
  const evalCase = EVAL_CASES.get(caseId);
  return {
    testCase: { description: evalCase.description, vars: { request: `task ${index}` } },
    prompt: { raw: `rendered task ${index}` },
    response: { output: `candidate ${index}` },
    gradingResult: {
      componentResults: [{ pass: true, reason: `hard gate ${index} passed` }],
    },
    metadata: {
      skillCreatorEvals: {
        retainedWorkspace: `/private/tmp/skill-creator-evals-${index}/workspace`,
      },
    },
  };
}

test("builds three offline Luna xhigh smoke reviewers", () => {
  const rows = SMOKE_CASE_IDS.map(candidateRow);
  const config = buildJudgeConfig(rows, EVAL_DIRECTORY, 5);

  assert.equal(config.tests.length, 3);
  assert.equal(config.evaluateOptions.maxConcurrency, 3);
  assert.deepEqual(
    config.tests.map((item) => item.vars.originalTask),
    ["rendered task 0", "rendered task 1", "rendered task 2"],
  );
  assert.ok(
    config.tests.every((item) => {
      const reviewer = item.assert[0].provider.config;
      return (
        reviewer.model === "gpt-5.6-luna" &&
        reviewer.model_reasoning_effort === "xhigh" &&
        reviewer.sandbox_mode === "read-only" &&
        reviewer.network_access_enabled === false
      );
    }),
  );
  assert.throws(() => buildJudgeConfig([], EVAL_DIRECTORY, 3), /At least one candidate/);
  assert.throws(
    () => buildJudgeConfig([rows[0], rows[0]], EVAL_DIRECTORY, 3),
    /Duplicate candidate case/,
  );
});

test("cleans retained workspaces unless evidence preservation is requested", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "skill-creator-evals-"));
  const workspace = path.join(tempRoot, "workspace");
  const rows = [{ metadata: { skillCreatorEvals: { retainedWorkspace: workspace } } }];

  await cleanupWorkspaces(rows, true);
  await access(tempRoot);
  await cleanupWorkspaces(rows, false);
  await assert.rejects(access(tempRoot));
});
