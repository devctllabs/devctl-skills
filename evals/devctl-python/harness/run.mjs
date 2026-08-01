#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REASON_LIMIT = 1_000;
const MAX_REASONS_PER_CASE = 20;
const DEFAULT_MAX_CONCURRENCY = 3;
const DEFAULT_JUDGE_MODEL = "gpt-5.6-luna";
const DEFAULT_JUDGE_REASONING_EFFORT = "high";
export const OPTIMIZATION_BASELINE_WORDS = 4_918;
export const OPTIMIZATION_TARGET_WORDS = 4_200;
export const OPTIMIZATION_ARTIFACTS = [
  "SKILL.md",
  path.join("references", "code-principles.md"),
  path.join("references", "testing-strategy.md"),
];
export const COST_STAGES = ["deterministic", "judged-candidate", "judged-rubric"];
const JUDGED_CASES = new Map([
  [
    "Recommend the complete fallback quality stack without changing the repository",
    {
      rubric: "quality-tooling.md",
      reasoningEffort: "medium",
    },
  ],
  [
    "Plan a multi-layer production change as component-complete outside-in TDD",
    {
      rubric: "outside-in-plan.md",
    },
  ],
  [
    "Refactor mixed filesystem and subprocess access behind capability boundaries",
    {
      rubric: "io-boundaries.md",
    },
  ],
  [
    "Replace anonymous records and repository helpers with typed capability boundaries",
    {
      rubric: "typed-layer-contracts.md",
    },
  ],
  [
    "Implement catalog remove with scenario-sized outside-in TDD",
    {
      rubric: "public-operation-implementation.md",
    },
  ],
  [
    "Detect concentrated complexity and owner-test gaps despite green quality gates",
    {
      rubric: "quality-hotspots.md",
    },
  ],
]);
const USAGE =
  "Usage: run.mjs all [--max-concurrency <positive-integer>]";

export function countWords(value) {
  const trimmed = value.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

async function assertOptimizationTarget(evalDirectory) {
  const targetDirectory =
    process.env.SKILL_CREATOR_EVALS_TARGET_DIR ||
    path.resolve(evalDirectory, "../../skills/devctl-python");
  const artifacts = OPTIMIZATION_ARTIFACTS.map((artifact) =>
    path.join(targetDirectory, artifact),
  );
  const counts = await Promise.all(
    artifacts.map(async (artifact) => countWords(await readFile(artifact, "utf8"))),
  );
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total > OPTIMIZATION_TARGET_WORDS) {
    throw new Error(
      `Mandatory context hard gate failed: ${total} words exceeds ${OPTIMIZATION_TARGET_WORDS} ` +
        `(baseline ${OPTIMIZATION_BASELINE_WORDS})`,
    );
  }
  process.stdout.write(
    `PASS mandatory context: ${total}/${OPTIMIZATION_TARGET_WORDS} words ` +
      `(baseline ${OPTIMIZATION_BASELINE_WORDS})\n`,
  );
}

function resultKey(result) {
  const description = result.testCase?.description ?? result.description;
  if (!description) {
    throw new Error("Every Promptfoo test must have a unique description");
  }
  const provider = result.provider?.id ?? result.provider?.label ?? "provider";
  return `${description}:${result.promptIdx}:${provider}`;
}

function collectFailedReasons(component, reasons) {
  const children = component?.componentResults;
  if (Array.isArray(children) && children.length > 0) {
    for (const child of children) {
      if (child.pass === false) {
        collectFailedReasons(child, reasons);
      }
    }
    return;
  }
  if (component?.pass === false && component.reason) {
    reasons.add(component.reason.slice(0, REASON_LIMIT));
  }
}

export function failureReasons(result) {
  if (result.failureReason === 2) {
    return result.error ? [result.error.slice(0, REASON_LIMIT)] : [];
  }
  const reasons = new Set();
  collectFailedReasons(result.gradingResult, reasons);
  if (reasons.size === 0) {
    const fallback = result.gradingResult?.reason ?? result.error;
    if (fallback) {
      reasons.add(fallback.slice(0, REASON_LIMIT));
    }
  }
  return [...reasons].slice(0, MAX_REASONS_PER_CASE);
}

export function summarizeResults(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : payload.version === 3
      ? payload.results
      : payload.results?.results;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Unsupported Promptfoo JSON result format");
  }

  const groups = new Map();
  for (const result of rows) {
    const key = resultKey(result);
    const group = groups.get(key) ?? {
      description: result.testCase?.description ?? result.description,
      total: 0,
      passed: 0,
      errors: 0,
      reasons: [],
    };
    group.total += 1;
    group.passed += result.success ? 1 : 0;
    group.errors += result.failureReason === 2 ? 1 : 0;
    if (!result.success) {
      for (const reason of failureReasons(result)) {
        if (!group.reasons.includes(reason) && group.reasons.length < MAX_REASONS_PER_CASE) {
          group.reasons.push(reason);
        }
      }
    }
    groups.set(key, group);
  }

  const cases = [...groups.values()].map((group) => ({
    ...group,
    pass:
      group.total === 1 &&
      group.passed === 1 &&
      group.errors === 0,
  }));
  return { pass: cases.length > 0 && cases.every((item) => item.pass), cases };
}

function printSummary(summary) {
  for (const item of summary.cases) {
    const status = item.pass ? "PASS" : "FAIL";
    process.stdout.write(
      `${status} ${item.description}: ${item.passed}/${item.total} passed, ${item.errors} errors\n`,
    );
    for (const reason of item.reasons) {
      process.stdout.write(`  ${reason}\n`);
    }
  }
}

function requirePositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

export function settingsForCommand(command, maxConcurrency = DEFAULT_MAX_CONCURRENCY) {
  requirePositiveInteger(maxConcurrency, "maxConcurrency");
  if (command === "all") {
    return { maxConcurrency };
  }
  throw new Error(USAGE);
}

export function parseRunArgs(argv) {
  const [command, ...options] = argv;
  let maxConcurrency = DEFAULT_MAX_CONCURRENCY;

  if (options.length > 0) {
    if (options.length !== 2 || options[0] !== "--max-concurrency") {
      throw new Error(USAGE);
    }
    maxConcurrency = requirePositiveInteger(
      Number(options[1]),
      "--max-concurrency",
    );
  }

  settingsForCommand(command, maxConcurrency);
  return { command, maxConcurrency };
}

export async function runCostStages(executeStage, stages = COST_STAGES) {
  for (const stage of stages) {
    const exitCode = await executeStage(stage);
    if (exitCode !== 0) {
      return exitCode;
    }
  }
  return 0;
}

async function runTier({
  evalDirectory,
  maxConcurrency,
  resultDirectory,
  tier,
  keepWorkspaces = false,
}) {
  const suffix = `-all-${tier}`;
  const resultPath = path.join(resultDirectory, `results${suffix}.jsonl`);
  const reportPath = path.join(resultDirectory, `report${suffix}.json`);
  const promptfooDirectory = path.join(resultDirectory, `promptfoo-runtime${suffix}`);

  process.stdout.write(`Cost tier: ${tier}\n`);
  const child = spawnSync(
    "promptfoo",
    [
      "eval",
      "-c",
      "promptfooconfig.yaml",
      "--filter-metadata",
      `costTier=${tier}`,
      "--no-cache",
      "--no-share",
      "--no-table",
      "--max-concurrency",
      String(maxConcurrency),
      "--repeat",
      "1",
      "--output",
      resultPath,
      reportPath,
    ],
    {
      cwd: evalDirectory,
      encoding: "utf8",
      env: {
        ...process.env,
        ...(keepWorkspaces ? { SKILL_CREATOR_EVALS_KEEP_WORKSPACES: "1" } : {}),
        PROMPTFOO_DISABLE_TELEMETRY: "1",
        PROMPTFOO_DISABLE_UPDATE: "1",
        PROMPTFOO_CONFIG_DIR: promptfooDirectory,
        PROMPTFOO_LOG_DIR: path.join(promptfooDirectory, "logs"),
      },
      stdio: "inherit",
    },
  );

  let payload;
  try {
    payload = (await readFile(resultPath, "utf8"))
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    throw new Error(
      `Promptfoo did not produce a readable ${tier} result (exit ${child.status ?? "unknown"}): ${error.message}. Runtime evidence: ${promptfooDirectory}`,
    );
  }
  const summary = summarizeResults(payload);
  if (![0, 100].includes(child.status)) {
    throw new Error(
      `Promptfoo exited with infrastructure status ${child.status ?? "unknown"} in ${tier}. Runtime evidence: ${promptfooDirectory}`,
    );
  }
  await rm(promptfooDirectory, { recursive: true, force: true });
  printSummary(summary);
  return { exitCode: summary.pass ? 0 : 100, payload };
}

function candidateOutput(row) {
  const output = row.response?.output;
  if (typeof output !== "string" || output.length === 0) {
    throw new Error(`Missing candidate output for ${row.testCase?.description ?? "judged row"}`);
  }
  return output;
}

function retainedWorkspace(row) {
  const workspace = row.metadata?.skillCreatorEvals?.retainedWorkspace;
  if (typeof workspace !== "string" || workspace.length === 0) {
    throw new Error(
      `Missing retained workspace for ${row.testCase?.description ?? "judged row"}`,
    );
  }
  return workspace;
}

function originalTask(row) {
  return (
    row.testCase?.vars?.request ??
    row.vars?.request ??
    row.prompt?.raw ??
    row.prompt ??
    "Original task unavailable"
  );
}

function deterministicEvidence(row) {
  const reasons = [];
  const visit = (component) => {
    if (!component || typeof component !== "object") {
      return;
    }
    if (Array.isArray(component.componentResults) && component.componentResults.length > 0) {
      for (const child of component.componentResults) {
        visit(child);
      }
      return;
    }
    if (component.reason) {
      reasons.push(String(component.reason));
    }
  };
  visit(row.gradingResult);
  return reasons.length > 0
    ? reasons.slice(0, MAX_REASONS_PER_CASE).join("\n")
    : "All deterministic hard gates passed; no component reasons were exported.";
}

export function buildJudgeConfig(rows, evalDirectory, maxConcurrency) {
  const tests = rows.map((row) => {
    const description = row.testCase?.description;
    const judge = JUDGED_CASES.get(description);
    if (!judge) {
      throw new Error(`Unexpected judged case: ${description ?? "missing description"}`);
    }
    return {
      description: `Judge ${description}`,
      vars: {
        candidateOutput: candidateOutput(row),
        deterministicEvidence: deterministicEvidence(row),
        originalTask: originalTask(row),
        workspaceDir: retainedWorkspace(row),
        rubric: pathToFileURL(
          path.join(evalDirectory, "rubrics", judge.rubric),
        ).href,
      },
      assert: [
        {
          type: "agent-rubric",
          value: "{{rubric}}",
          threshold: 1,
          provider: {
            id: "openai:codex-sdk",
            config: {
              codex_path_override: "codex",
              working_dir: "{{workspaceDir}}",
              model: DEFAULT_JUDGE_MODEL,
              model_reasoning_effort:
                judge.reasoningEffort ?? DEFAULT_JUDGE_REASONING_EFFORT,
              sandbox_mode: "read-only",
              approval_policy: "never",
              network_access_enabled: false,
              web_search_mode: "disabled",
              inherit_process_env: false,
              skip_git_repo_check: false,
            },
          },
        },
      ],
    };
  });
  if (tests.length !== JUDGED_CASES.size) {
    throw new Error(`Expected ${JUDGED_CASES.size} judged rows, received ${tests.length}`);
  }
  return {
    description: "Judge passing devctl-python candidate workspaces",
    prompts: [
      "Original task:\n{{originalTask}}\n\nCandidate response:\n{{candidateOutput}}\n\nDeterministic evidence:\n{{deterministicEvidence}}",
    ],
    providers: [
      {
        id: pathToFileURL(
          path.join(evalDirectory, "harness", "static-output-provider.mjs"),
        ).href,
      },
    ],
    tests,
    evaluateOptions: {
      maxConcurrency: Math.min(maxConcurrency, JUDGED_CASES.size),
      cache: false,
    },
  };
}

async function runJudgeStage({
  evalDirectory,
  maxConcurrency,
  resultDirectory,
  rows,
}) {
  const suffix = "-all-judged-rubric";
  const configPath = path.join(resultDirectory, "judge-config-all.json");
  const resultPath = path.join(resultDirectory, `results${suffix}.jsonl`);
  const reportPath = path.join(resultDirectory, `report${suffix}.json`);
  const promptfooDirectory = path.join(resultDirectory, `promptfoo-runtime${suffix}`);
  await writeFile(
    configPath,
    `${JSON.stringify(buildJudgeConfig(rows, evalDirectory, maxConcurrency), null, 2)}\n`,
    "utf8",
  );

  process.stdout.write("Cost stage: judged-rubric\n");
  const child = spawnSync(
    "promptfoo",
    [
      "eval",
      "-c",
      configPath,
      "--no-cache",
      "--no-share",
      "--no-table",
      "--max-concurrency",
      String(Math.min(maxConcurrency, JUDGED_CASES.size)),
      "--repeat",
      "1",
      "--output",
      resultPath,
      reportPath,
    ],
    {
      cwd: evalDirectory,
      encoding: "utf8",
      env: {
        ...process.env,
        PROMPTFOO_DISABLE_TELEMETRY: "1",
        PROMPTFOO_DISABLE_UPDATE: "1",
        PROMPTFOO_CONFIG_DIR: promptfooDirectory,
        PROMPTFOO_LOG_DIR: path.join(promptfooDirectory, "logs"),
      },
      stdio: "inherit",
    },
  );
  let payload;
  try {
    payload = (await readFile(resultPath, "utf8"))
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    throw new Error(
      `Promptfoo did not produce readable judge results (exit ${child.status ?? "unknown"}): ${error.message}. Runtime evidence: ${promptfooDirectory}`,
    );
  }
  const summary = summarizeResults(payload);
  if (![0, 100].includes(child.status)) {
    throw new Error(
      `Promptfoo exited with infrastructure status ${child.status ?? "unknown"} in judged-rubric. Runtime evidence: ${promptfooDirectory}`,
    );
  }
  await rm(promptfooDirectory, { recursive: true, force: true });
  printSummary(summary);
  return summary.pass ? 0 : 100;
}

async function cleanupRetainedWorkspaces(rows, preserve) {
  if (preserve) {
    return;
  }
  const expectedPrefix = path.join(os.tmpdir(), "skill-creator-evals-");
  for (const row of rows) {
    const workspace = retainedWorkspace(row);
    const tempRoot = path.dirname(workspace);
    if (!tempRoot.startsWith(expectedPrefix)) {
      throw new Error(`Refusing to remove unexpected judged workspace: ${tempRoot}`);
    }
    await rm(tempRoot, { recursive: true, force: true });
  }
}

export async function run(command, options = {}) {
  const { maxConcurrency } = settingsForCommand(
    command,
    options.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY,
  );
  const harnessDirectory = path.dirname(fileURLToPath(import.meta.url));
  const evalDirectory = path.dirname(harnessDirectory);
  await assertOptimizationTarget(evalDirectory);
  const resultDirectory = await mkdtemp(path.join(os.tmpdir(), "skill-creator-evals-results-"));
  const preserveWorkspaces = process.env.SKILL_CREATOR_EVALS_KEEP_WORKSPACES === "1";

  let judgedRows = [];
  const exitCode = await runCostStages(async (stage) => {
    if (stage === "deterministic") {
      const result = await runTier({
        evalDirectory,
        maxConcurrency,
        resultDirectory,
        tier: "deterministic",
      });
      return result.exitCode;
    }
    if (stage === "judged-candidate") {
      const result = await runTier({
        evalDirectory,
        maxConcurrency,
        resultDirectory,
        tier: "judged",
        keepWorkspaces: true,
      });
      judgedRows = result.payload;
      if (result.exitCode !== 0) {
        await cleanupRetainedWorkspaces(judgedRows, preserveWorkspaces);
      }
      return result.exitCode;
    }
    try {
      return await runJudgeStage({
        evalDirectory,
        maxConcurrency,
        resultDirectory,
        rows: judgedRows,
      });
    } finally {
      await cleanupRetainedWorkspaces(judgedRows, preserveWorkspaces);
    }
  });
  if (exitCode !== 0) {
    process.stdout.write(`Evidence: ${resultDirectory}\n`);
    return exitCode;
  }

  process.stdout.write(`Evidence: ${resultDirectory}\n`);
  return 0;
}

const isEntrypoint =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isEntrypoint) {
  let args;
  try {
    args = parseRunArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }

  if (args) {
    run(args.command, { maxConcurrency: args.maxConcurrency }).then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    },
    );
  }
}
