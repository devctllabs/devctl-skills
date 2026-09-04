#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { prefetchModules } from "./prefetch.mjs";

const DEFAULT_MAX_CONCURRENCY = 3;
const JUDGE_MODEL = "gpt-5.6-luna";
const JUDGE_REASONING_EFFORT = "xhigh";
const REASON_LIMIT = 1_000;
const USAGE =
  "Usage: run.mjs all [--max-concurrency <positive-integer>] | " +
  "run.mjs cases <case-id>... [--with-judge] [--max-concurrency <positive-integer>]";

export const EVAL_CASES = new Map([
  [
    "new-application-layout",
    {
      description: "Choose the normative package layout for a new Go service",
      rubric: "new-application-layout.md",
    },
  ],
  [
    "lifecycle-health-runtime",
    {
      description: "Plan API and optional health runtime lifecycle",
      rubric: "lifecycle-health-runtime.md",
    },
  ],
  [
    "outside-in-cli-filesystem",
    {
      description: "Implement a CLI-backed filesystem feature from its public boundary",
      rubric: "vertical-outside-in.md",
    },
  ],
  [
    "domain-run-lifecycle",
    {
      description: "Implement a domain lifecycle from business vocabulary",
      rubric: "layer-implementation.md",
    },
  ],
  [
    "service-start-run",
    {
      description: "Implement a service operation with consumer-owned capabilities",
      rubric: "layer-implementation.md",
    },
  ],
  [
    "usecase-dispatch-run",
    {
      description: "Implement a reusable multi-service usecase",
      rubric: "layer-implementation.md",
    },
  ],
  [
    "repository-run-store",
    {
      description: "Implement an atomic filesystem repository",
      rubric: "layer-implementation.md",
    },
  ],
  [
    "client-codex-runner",
    {
      description: "Implement a subprocess client",
      rubric: "layer-implementation.md",
    },
  ],
  [
    "transport-http-start-run",
    {
      description: "Implement an HTTP delivery adapter",
      rubric: "layer-implementation.md",
    },
  ],
  [
    "transport-grpc-start-run",
    {
      description: "Implement a generated-contract gRPC adapter",
      rubric: "layer-implementation.md",
    },
  ],
  [
    "kafka-run-consumer",
    {
      description: "Implement a Kafka consumer with explicit failure policy",
      rubric: "layer-implementation.md",
    },
  ],
  [
    "cmd-runwatch",
    {
      description: "Implement a thin service CLI",
      rubric: "layer-implementation.md",
    },
  ],
  [
    "cmd-nested-layout",
    {
      description: "Refactor a nested CLI by command ownership",
      rubric: "cmd-layout.md",
    },
  ],
  [
    "dependency-wiring",
    {
      description: "Implement dependency wiring and shutdown",
      rubric: "layer-implementation.md",
    },
  ],
]);

export const SMOKE_CASE_IDS = [
  "outside-in-cli-filesystem",
  "transport-http-start-run",
  "dependency-wiring",
];

const CASES_BY_DESCRIPTION = new Map(
  [...EVAL_CASES.entries()].map(([id, config]) => [config.description, { id, ...config }]),
);

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

export function parseRunArgs(argv) {
  const [command, ...tokens] = argv;
  if (!["all", "cases"].includes(command)) {
    throw new Error(USAGE);
  }

  let maxConcurrency = DEFAULT_MAX_CONCURRENCY;
  let withJudge = false;
  const caseIds = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--max-concurrency") {
      if (index + 1 >= tokens.length) {
        throw new Error(USAGE);
      }
      maxConcurrency = positiveInteger(Number(tokens[index + 1]), "--max-concurrency");
      index += 1;
      continue;
    }
    if (token === "--with-judge") {
      if (command !== "cases" || withJudge) {
        throw new Error(USAGE);
      }
      withJudge = true;
      continue;
    }
    if (token.startsWith("--") || command !== "cases") {
      throw new Error(USAGE);
    }
    caseIds.push(token);
  }

  if (command === "all" && (caseIds.length > 0 || withJudge)) {
    throw new Error(USAGE);
  }
  if (command === "cases") {
    if (caseIds.length === 0 || new Set(caseIds).size !== caseIds.length) {
      throw new Error(USAGE);
    }
    for (const caseId of caseIds) {
      if (!EVAL_CASES.has(caseId)) {
        throw new Error(`Unknown case ID: ${caseId}\n${USAGE}`);
      }
    }
  }
  return { command, maxConcurrency, caseIds, withJudge };
}

export function selectCases(caseIds) {
  const ids = caseIds.length > 0 ? caseIds : [...EVAL_CASES.keys()];
  return ids.map((id) => ({ id, ...EVAL_CASES.get(id) }));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function caseFilterPattern(cases) {
  if (!Array.isArray(cases) || cases.length === 0) {
    throw new Error("At least one case is required for a filter pattern");
  }
  return `^(?:${cases.map((item) => escapeRegex(item.description)).join("|")})$`;
}

function collectReasons(component, reasons) {
  if (Array.isArray(component?.componentResults) && component.componentResults.length > 0) {
    for (const child of component.componentResults) {
      collectReasons(child, reasons);
    }
    return;
  }
  if (component?.reason) {
    reasons.push(String(component.reason).slice(0, REASON_LIMIT));
  }
}

function failureReasons(row) {
  if (row.failureReason === 2) {
    return row.error ? [String(row.error).slice(0, REASON_LIMIT)] : [];
  }
  const reasons = [];
  collectReasons(row.gradingResult, reasons);
  return [...new Set(reasons)].slice(0, 20);
}

export function summarizeResults(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Promptfoo produced no result rows");
  }
  return {
    pass: rows.every((row) => row.success === true && row.failureReason !== 2),
    cases: rows.map((row) => ({
      description: row.testCase?.description ?? row.description ?? "unnamed case",
      pass: row.success === true && row.failureReason !== 2,
      error: row.failureReason === 2,
      reasons: row.success ? [] : failureReasons(row),
    })),
  };
}

function printSummary(label, summary) {
  process.stdout.write(`${label}:\n`);
  for (const item of summary.cases) {
    process.stdout.write(
      `${item.pass ? "PASS" : item.error ? "ERROR" : "FAIL"} ${item.description}\n`,
    );
    for (const reason of item.reasons) {
      process.stdout.write(`  ${reason}\n`);
    }
  }
}

async function readRows(resultPath, stage, status) {
  try {
    return (await readFile(resultPath, "utf8"))
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    throw new Error(
      `Promptfoo did not produce readable ${stage} evidence (exit ${status ?? "unknown"}): ${error.message}`,
    );
  }
}

async function runPromptfoo({ args, cwd, resultPath, runtimeDirectory, env = {} }) {
  await mkdir(path.join(runtimeDirectory, "logs"), { recursive: true });
  const child = spawnSync("promptfoo", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
      PROMPTFOO_DISABLE_TELEMETRY: "1",
      PROMPTFOO_DISABLE_UPDATE: "1",
      PROMPTFOO_CONFIG_DIR: runtimeDirectory,
      PROMPTFOO_LOG_DIR: path.join(runtimeDirectory, "logs"),
    },
    stdio: "inherit",
    shell: false,
  });
  if (child.error) {
    throw child.error;
  }
  const rows = await readRows(resultPath, "eval", child.status);
  if (![0, 100].includes(child.status)) {
    throw new Error(`Promptfoo exited with infrastructure status ${child.status ?? "unknown"}`);
  }
  return rows;
}

async function runCandidateStage({ cases, evalDirectory, maxConcurrency, resultDirectory, retain }) {
  const resultPath = path.join(resultDirectory, "results-candidate.jsonl");
  const runtimeDirectory = path.join(resultDirectory, "promptfoo-runtime-candidate");
  const rows = await runPromptfoo({
    cwd: evalDirectory,
    resultPath,
    runtimeDirectory,
    env: retain ? { SKILL_CREATOR_EVALS_KEEP_WORKSPACES: "1" } : {},
    args: [
      "eval",
      "--config",
      "promptfooconfig.yaml",
      "--filter-pattern",
      caseFilterPattern(cases),
      "--max-concurrency",
      String(maxConcurrency),
      "--no-cache",
      "--no-share",
      "--no-table",
      "--repeat",
      "1",
      "--output",
      resultPath,
    ],
  });
  await rm(runtimeDirectory, { recursive: true, force: true });
  const summary = summarizeResults(rows);
  printSummary("Candidate stage", summary);
  return { exitCode: summary.pass ? 0 : 100, rows };
}

function candidateOutput(row) {
  const output = row.response?.output;
  if (typeof output !== "string" || output.length === 0) {
    throw new Error(`Missing candidate output for ${row.testCase?.description ?? "case"}`);
  }
  return output;
}

function retainedWorkspace(row) {
  const workspace = row.metadata?.skillCreatorEvals?.retainedWorkspace;
  if (typeof workspace !== "string" || workspace.length === 0) {
    throw new Error(`Missing retained workspace for ${row.testCase?.description ?? "case"}`);
  }
  return workspace;
}

function originalTask(row) {
  return row.prompt?.raw ?? row.prompt ?? row.testCase?.vars?.request ?? "Task unavailable";
}

function deterministicEvidence(row) {
  const reasons = [];
  collectReasons(row.gradingResult, reasons);
  return reasons.length > 0
    ? [...new Set(reasons)].join("\n")
    : "All deterministic hard gates passed without exported component reasons.";
}

export function buildJudgeConfig(rows, evalDirectory, maxConcurrency) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("At least one candidate row is required");
  }
  const descriptions = new Set();
  const tests = rows.map((row) => {
    const description = row.testCase?.description;
    const evalCase = CASES_BY_DESCRIPTION.get(description);
    if (!evalCase) {
      throw new Error(`Unknown candidate case: ${description ?? "missing description"}`);
    }
    if (descriptions.has(description)) {
      throw new Error(`Duplicate candidate case: ${description}`);
    }
    descriptions.add(description);
    return {
      description: `Review ${description}`,
      vars: {
        candidateOutput: candidateOutput(row),
        deterministicEvidence: deterministicEvidence(row),
        originalTask: originalTask(row),
        rubric: pathToFileURL(path.join(evalDirectory, "rubrics", evalCase.rubric)).href,
        workspaceDir: retainedWorkspace(row),
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
              model: JUDGE_MODEL,
              model_reasoning_effort: JUDGE_REASONING_EFFORT,
              working_dir: "{{workspaceDir}}",
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
  return {
    description: "Review passing devctl-go candidate workspaces",
    prompts: [
      "Original task:\n{{originalTask}}\n\nCandidate response:\n{{candidateOutput}}\n\n" +
        "Deterministic evidence:\n{{deterministicEvidence}}",
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
      maxConcurrency: Math.min(maxConcurrency, tests.length),
      cache: false,
    },
  };
}

async function runJudgeStage({ evalDirectory, maxConcurrency, resultDirectory, rows }) {
  const configPath = path.join(resultDirectory, "judge-config.json");
  const resultPath = path.join(resultDirectory, "results-reviewer.jsonl");
  const runtimeDirectory = path.join(resultDirectory, "promptfoo-runtime-reviewer");
  await writeFile(
    configPath,
    `${JSON.stringify(buildJudgeConfig(rows, evalDirectory, maxConcurrency), null, 2)}\n`,
    "utf8",
  );
  const judgeRows = await runPromptfoo({
    cwd: evalDirectory,
    resultPath,
    runtimeDirectory,
    args: [
      "eval",
      "--config",
      configPath,
      "--max-concurrency",
      String(Math.min(maxConcurrency, rows.length)),
      "--no-cache",
      "--no-share",
      "--no-table",
      "--repeat",
      "1",
      "--output",
      resultPath,
    ],
  });
  await rm(runtimeDirectory, { recursive: true, force: true });
  const summary = summarizeResults(judgeRows);
  printSummary("Reviewer stage", summary);
  return summary.pass ? 0 : 100;
}

export async function cleanupWorkspaces(rows, preserve) {
  if (preserve) {
    return;
  }
  const expectedPrefix = path.join(os.tmpdir(), "skill-creator-evals-");
  for (const row of rows) {
    const workspace = row.metadata?.skillCreatorEvals?.retainedWorkspace;
    if (!workspace) {
      continue;
    }
    const tempRoot = path.dirname(workspace);
    if (!tempRoot.startsWith(expectedPrefix)) {
      throw new Error(`Refusing to remove unexpected temp directory: ${tempRoot}`);
    }
    await rm(tempRoot, { recursive: true, force: true });
  }
}

export async function runStages(runCandidate, runReviewer, withJudge) {
  const candidate = await runCandidate();
  if (candidate.exitCode !== 0 || !withJudge) {
    return candidate.exitCode;
  }
  return runReviewer(candidate.rows);
}

export async function run(command, options = {}) {
  const maxConcurrency = positiveInteger(
    options.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY,
    "maxConcurrency",
  );
  const cases = selectCases(command === "cases" ? options.caseIds ?? [] : []);
  const withJudge = command === "all" || options.withJudge === true;
  const harnessDirectory = path.dirname(fileURLToPath(import.meta.url));
  const evalDirectory = path.dirname(harnessDirectory);
  const resultDirectory = await mkdtemp(path.join(os.tmpdir(), "devctl-go-evals-results-"));
  const preserve = process.env.SKILL_CREATOR_EVALS_KEEP_WORKSPACES === "1";

  await prefetchModules();
  let candidateRows = [];
  let exitCode = 1;
  try {
    exitCode = await runStages(
      async () => {
        const result = await runCandidateStage({
          cases,
          evalDirectory,
          maxConcurrency,
          resultDirectory,
          retain: withJudge,
        });
        candidateRows = result.rows;
        return result;
      },
      (rows) => runJudgeStage({ evalDirectory, maxConcurrency, resultDirectory, rows }),
      withJudge,
    );
  } finally {
    if (withJudge) {
      const keepWorkspaces = preserve || exitCode !== 0;
      await cleanupWorkspaces(candidateRows, keepWorkspaces);
      if (keepWorkspaces) {
        for (const row of candidateRows) {
          const workspace = row.metadata?.skillCreatorEvals?.retainedWorkspace;
          if (workspace) {
            process.stdout.write(`Retained workspace: ${workspace}\n`);
          }
        }
      }
    }
    process.stdout.write(`Evidence: ${resultDirectory}\n`);
  }
  return exitCode;
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
    run(args.command, args).then(
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
