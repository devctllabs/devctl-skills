#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REASON_LIMIT = 1_000;
const MAX_REASONS_PER_CASE = 20;
const DEFAULT_MAX_CONCURRENCY = 3;
const USAGE =
  "Usage: run.mjs all [--max-concurrency <positive-integer>]";

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

export async function run(command, options = {}) {
  const { maxConcurrency } = settingsForCommand(
    command,
    options.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY,
  );
  const harnessDirectory = path.dirname(fileURLToPath(import.meta.url));
  const evalDirectory = path.dirname(harnessDirectory);
  const resultDirectory = await mkdtemp(
    path.join(os.tmpdir(), "skill-creator-evals-results-"),
  );
  const resultPath = path.join(resultDirectory, "results-all.jsonl");
  const reportPath = path.join(resultDirectory, "report-all.json");
  const promptfooDirectory = path.join(resultDirectory, "promptfoo-runtime-all");

  const child = spawnSync(
    "promptfoo",
    [
      "eval",
      "-c",
      "promptfooconfig.yaml",
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
      `Promptfoo did not produce readable row evidence (exit ${child.status ?? "unknown"}): ${error.message}. Runtime evidence: ${promptfooDirectory}`,
    );
  }
  const summary = summarizeResults(payload);
  if (![0, 100].includes(child.status)) {
    throw new Error(
      `Promptfoo exited with infrastructure status ${child.status ?? "unknown"}. Runtime evidence: ${promptfooDirectory}`,
    );
  }
  await rm(promptfooDirectory, { recursive: true, force: true });
  printSummary(summary);

  process.stdout.write(`Evidence: ${resultDirectory}\n`);
  return summary.pass ? 0 : 100;
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
