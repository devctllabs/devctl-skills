import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildJudgeConfig,
  countWords,
  COST_STAGES,
  OPTIMIZATION_ARTIFACTS,
  OPTIMIZATION_BASELINE_WORDS,
  OPTIMIZATION_TARGET_WORDS,
  parseRunArgs,
  runCostStages,
  settingsForCommand,
} from "../harness/run.mjs";

const TEST_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const QUALITY_TOOLING = path.resolve(
  TEST_DIRECTORY,
  "../../../skills/devctl-python/references/quality-tooling.md",
);
const PROMPTFOO_CONFIG = path.resolve(TEST_DIRECTORY, "../promptfooconfig.yaml");

test("uses the approved mandatory-context word-count contract", () => {
  assert.equal(countWords(" one\n two  three "), 3);
  assert.equal(countWords(" \n "), 0);
  assert.equal(OPTIMIZATION_BASELINE_WORDS, 4_918);
  assert.equal(OPTIMIZATION_TARGET_WORDS, 4_200);
  assert.deepEqual(OPTIMIZATION_ARTIFACTS, [
    "SKILL.md",
    "references/code-principles.md",
    "references/testing-strategy.md",
  ]);
});

test("Ruff baseline keeps test complexity rules enabled", () => {
  const qualityTooling = readFileSync(QUALITY_TOOLING, "utf8");
  const testsIgnore = qualityTooling.match(/"tests\/\*\*" = \[(.*?)\]/s);

  assert.notEqual(testsIgnore, null);
  for (const rule of ["C901", "PLR0911", "PLR0912", "PLR0913", "PLR0915"]) {
    assert.doesNotMatch(testsIgnore[1], new RegExp(`"${rule}"`));
  }
});

test("candidate eval uses Luna through the current Codex CLI", () => {
  const config = readFileSync(PROMPTFOO_CONFIG, "utf8");

  assert.match(config, /codex_path_override:\s+"codex"/);
  assert.match(config, /model:\s+gpt-5\.6-luna/);
});

test("supports only all with configurable concurrency", () => {
  assert.deepEqual(settingsForCommand("all"), { maxConcurrency: 3 });
  assert.deepEqual(parseRunArgs(["all", "--max-concurrency", "5"]), {
    command: "all",
    maxConcurrency: 5,
  });
  assert.throws(() => parseRunArgs(["dev"]), /Usage: run\.mjs all/);
  assert.throws(() => parseRunArgs(["final"]), /Usage: run\.mjs all/);
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


test("builds one rubric row per retained judged workspace", () => {
  const descriptions = [
    "Recommend the complete fallback quality stack without changing the repository",
    "Plan a multi-layer production change as component-complete outside-in TDD",
    "Refactor mixed filesystem and subprocess access behind capability boundaries",
    "Replace anonymous records and repository helpers with typed capability boundaries",
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

  const config = buildJudgeConfig(rows, "/repo/evals/devctl-python", 3);

  assert.equal(config.tests.length, 6);
  assert.equal(config.evaluateOptions.maxConcurrency, 3);
  assert.deepEqual(
    config.tests.map((item) => item.vars.candidateOutput),
    ["candidate 0", "candidate 1", "candidate 2", "candidate 3", "candidate 4", "candidate 5"],
  );
  assert.deepEqual(
    config.tests.map((item) => item.vars.originalTask),
    ["task 0", "task 1", "task 2", "task 3", "task 4", "task 5"],
  );
  assert.deepEqual(
    config.tests.map((item) => item.vars.deterministicEvidence),
    [
      "hard gate 0 passed",
      "hard gate 1 passed",
      "hard gate 2 passed",
      "hard gate 3 passed",
      "hard gate 4 passed",
      "hard gate 5 passed",
    ],
  );
  assert.ok(
    config.tests.every(
      (item) => item.assert[0].provider.config.codex_path_override === "codex",
    ),
  );
});
