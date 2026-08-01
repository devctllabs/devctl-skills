import { execFileSync } from "node:child_process";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

function result(pass, reason) {
  return { pass, score: pass ? 1 : 0, reason };
}

async function exists(candidate) {
  try {
    await access(candidate);
    return true;
  } catch {
    return false;
  }
}

async function collectText(directory) {
  const chunks = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      chunks.push(await collectText(candidate));
    } else if (/\.(?:md|mjs|js|ya?ml|json)$/.test(entry.name)) {
      chunks.push(await readFile(candidate, "utf8"));
    }
  }
  return chunks.join("\n");
}

function status(workspace, protectedPath) {
  return execFileSync("git", ["status", "--porcelain", "--", protectedPath], {
    cwd: workspace,
    encoding: "utf8",
  }).trim();
}

export default async function assertOptimizationContract(_output, context) {
  const workspace = context.vars.workspaceDir;
  const suite = path.join(workspace, "evals", "sample-summary");
  const checks = [];
  const minimumReductionPercent = Number(context.vars.minimumReductionPercent);

  checks.push(
    result(
      status(workspace, ".agents/skills/sample-summary") === "",
      "The target sample-summary skill must remain unchanged before approval",
    ),
  );
  checks.push(
    result(
      status(workspace, "evals/sample-summary/cases/behavior.yaml") === "",
      "The existing behavior case must remain unchanged",
    ),
  );
  checks.push(
    result(
      status(workspace, "evals/sample-summary/harness/run.mjs") === "",
      "The existing all runner must remain unchanged",
    ),
  );
  checks.push(
    result(
      status(workspace, "evals/sample-summary").length > 0,
      "The optimization contract must add or update eval artifacts",
    ),
  );
  checks.push(
    result(!(await exists(path.join(workspace, "package.json"))), "Do not add package.json"),
  );

  const text = await collectText(suite);
  checks.push(
    result(
      Number.isFinite(minimumReductionPercent) && minimumReductionPercent > 0,
      "minimumReductionPercent must be a positive case input",
    ),
  );
  const reductionPattern = Number.isFinite(minimumReductionPercent)
    ? new RegExp(
        [
          `\\b${minimumReductionPercent}\\s*%`,
          `minimum[_-]?reduction[_-]?percent["']?\\s*[:=]\\s*${minimumReductionPercent}\\b`,
          `--min-reduction\\s+${minimumReductionPercent}\\b`,
        ].join("|"),
        "i",
      )
    : /$a/;
  for (const [pattern, reason] of [
    [/\bbaseline(?:\b|[_-])/i, "Optimization artifacts must define a baseline"],
    [
      reductionPattern,
      "Optimization artifacts must encode the user-provided improvement target",
    ],
    [/\bword(?:s| count)?\b/i, "Optimization artifacts must measure loaded word count"],
    [/SKILL\.md/, "Optimization artifacts must identify the measured skill instructions"],
    [
      /\bdeterministic\b|\bsingle measurement\b|\bmeasure(?:d)? once\b/i,
      "Optimization artifacts must state the deterministic measurement policy",
    ],
  ]) {
    checks.push(result(pattern.test(text), reason));
  }

  const pass = checks.every((check) => check.pass);
  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass
      ? "Optimization contract checks passed"
      : "Optimization contract checks failed",
    componentResults: checks,
  };
}
