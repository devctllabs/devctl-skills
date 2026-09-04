import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildJudgeConfig,
  caseFilterPattern,
  COST_STAGES,
  EVAL_CASES,
  parseRunArgs,
  runCostStages,
  selectCases,
  settingsForCommand,
} from "../harness/run.mjs";

const TEST_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PROMPTFOO_CONFIG = path.resolve(TEST_DIRECTORY, "../promptfooconfig.yaml");

test("candidate eval fixes Luna high and exactly six cases", () => {
  const config = readFileSync(PROMPTFOO_CONFIG, "utf8");

  assert.match(config, /codex_path_override:\s+"codex"/);
  assert.match(config, /model:\s+gpt-5\.6-luna/);
  assert.match(config, /model_reasoning_effort:\s+high/);
  assert.equal(config.match(/file:\/\/cases\//g)?.length, 6);
});

test("supports all with configurable concurrency", () => {
  assert.deepEqual(settingsForCommand("all"), { maxConcurrency: 3 });
  assert.deepEqual(parseRunArgs(["all", "--max-concurrency", "5"]), {
    caseIds: [],
    command: "all",
    maxConcurrency: 5,
    withJudge: false,
  });
  assert.throws(() => parseRunArgs(["dev"]), /Usage: run\.mjs all/);
  assert.throws(() => parseRunArgs(["final"]), /Usage: run\.mjs all/);
});

test("parses one or more targeted cases with optional reviewers", () => {
  assert.deepEqual(
    parseRunArgs([
      "cases",
      "io-boundaries-refactor",
      "library-kiss-tdd",
      "--with-judge",
      "--max-concurrency",
      "6",
    ]),
    {
      caseIds: ["io-boundaries-refactor", "library-kiss-tdd"],
      command: "cases",
      maxConcurrency: 6,
      withJudge: true,
    },
  );
  assert.throws(() => parseRunArgs(["cases"]), /Usage: run\.mjs all/);
  assert.throws(
    () => parseRunArgs(["cases", "missing-case"]),
    /Unknown case ID: missing-case/,
  );
  assert.throws(
    () => parseRunArgs(["cases", "io-boundaries-refactor", "io-boundaries-refactor"]),
    /Usage: run\.mjs all/,
  );
  assert.throws(
    () => parseRunArgs(["all", "--with-judge"]),
    /Usage: run\.mjs all/,
  );
});

test("selects cases by tier and builds an exact description filter", () => {
  assert.equal(EVAL_CASES.size, 6);
  const selection = selectCases(["library-kiss-tdd", "io-boundaries-refactor"]);

  assert.deepEqual(selection.deterministic.map((item) => item.id), ["library-kiss-tdd"]);
  assert.deepEqual(selection.judged.map((item) => item.id), ["io-boundaries-refactor"]);
  assert.deepEqual(selection.withoutReviewer.map((item) => item.id), ["library-kiss-tdd"]);

  const expression = new RegExp(
    caseFilterPattern([...selection.deterministic, ...selection.judged]),
  );
  assert.equal(expression.test(selection.deterministic[0].description), true);
  assert.equal(expression.test(selection.judged[0].description), true);
  assert.equal(expression.test(`prefix ${selection.judged[0].description}`), false);
  assert.throws(() => caseFilterPattern([]), /At least one case/);
});

test("runs deterministic generation before judged generation and rubrics", async () => {
  const calls = [];

  const exitCode = await runCostStages(async (stage) => {
    calls.push(stage);
    return 0;
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(calls, ["deterministic", "judged-candidate", "judged-rubric"]);
  assert.deepEqual(COST_STAGES, [
    "deterministic",
    "judged-candidate",
    "judged-rubric",
  ]);
});

test("does not start judged cases after a deterministic failure", async () => {
  const calls = [];

  const exitCode = await runCostStages(async (stage) => {
    calls.push(stage);
    return stage === "deterministic" ? 100 : 0;
  });

  assert.equal(exitCode, 100);
  assert.deepEqual(calls, ["deterministic"]);
});

test("does not run rubrics after a judged candidate hard-gate failure", async () => {
  const calls = [];

  const exitCode = await runCostStages(async (stage) => {
    calls.push(stage);
    return stage === "judged-candidate" ? 100 : 0;
  });

  assert.equal(exitCode, 100);
  assert.deepEqual(calls, ["deterministic", "judged-candidate"]);
});

test("builds three Luna xhigh reviewer rows", () => {
  const descriptions = [
    "Refactor mixed filesystem and subprocess access behind capability boundaries",
    "Implement catalog remove with scenario-sized outside-in TDD",
    "Detect concentrated complexity and owner-test gaps despite green quality gates",
  ];
  const rows = descriptions.map((description, index) => ({
    testCase: { description, vars: { request: `task ${index}` } },
    response: { output: `candidate ${index}` },
    gradingResult: {
      componentResults: [{ pass: true, reason: `hard gate ${index} passed` }],
    },
    metadata: {
      skillCreatorEvals: { retainedWorkspace: `/private/tmp/skill-creator-evals-${index}/workspace` },
    },
  }));

  const config = buildJudgeConfig(rows, "/repo/evals/devctl-python", 5);

  assert.equal(config.tests.length, 3);
  assert.equal(config.evaluateOptions.maxConcurrency, 3);
  assert.deepEqual(
    config.tests.map((item) => item.vars.candidateOutput),
    ["candidate 0", "candidate 1", "candidate 2"],
  );
  assert.deepEqual(
    config.tests.map((item) => item.vars.originalTask),
    ["task 0", "task 1", "task 2"],
  );
  assert.deepEqual(
    config.tests.map((item) => item.vars.deterministicEvidence),
    ["hard gate 0 passed", "hard gate 1 passed", "hard gate 2 passed"],
  );
  assert.ok(
    config.tests.every((item) => {
      const reviewer = item.assert[0].provider.config;
      return (
        reviewer.codex_path_override === "codex" &&
        reviewer.model === "gpt-5.6-luna" &&
        reviewer.model_reasoning_effort === "xhigh"
      );
    }),
  );
});

test("builds a Luna xhigh reviewer config for a selected subset", () => {
  const description =
    "Refactor mixed filesystem and subprocess access behind capability boundaries";
  const row = {
    testCase: { description, vars: { request: "task" } },
    response: { output: "candidate" },
    gradingResult: { componentResults: [{ pass: true, reason: "hard gates passed" }] },
    metadata: {
      skillCreatorEvals: { retainedWorkspace: "/private/tmp/skill-creator-evals-io/workspace" },
    },
  };

  const config = buildJudgeConfig([row], "/repo/evals/devctl-python", 6);

  assert.equal(config.tests.length, 1);
  assert.equal(config.evaluateOptions.maxConcurrency, 1);
  assert.equal(config.tests[0].assert[0].provider.config.model, "gpt-5.6-luna");
  assert.equal(config.tests[0].assert[0].provider.config.model_reasoning_effort, "xhigh");
  assert.throws(
    () => buildJudgeConfig([], "/repo/evals/devctl-python", 6),
    /At least one judged row/,
  );
  assert.throws(
    () => buildJudgeConfig([row, row], "/repo/evals/devctl-python", 6),
    /Duplicate judged case/,
  );
});
