import { execFileSync } from "node:child_process";
import { access, readdir } from "node:fs/promises";
import path from "node:path";

async function exists(candidate) {
  try {
    await access(candidate);
    return true;
  } catch {
    return false;
  }
}

function result(pass, reason) {
  return { pass, score: pass ? 1 : 0, reason };
}

export default async function assertSelfSmoke(_output, context) {
  const workspace = context.vars.workspaceDir;
  const checks = [];
  const requestedConcurrency = Number(context.vars.requestedConcurrency);

  checks.push(
    result(
      Number.isInteger(requestedConcurrency) && requestedConcurrency > 0,
      "requestedConcurrency must be a positive case input",
    ),
  );
  checks.push(
    result(
      (
        await readdir(path.join(workspace, "evals", "sample-review", "cases"))
      ).filter((name) => name.endsWith(".yaml")).length === 1,
      "Reuse the one existing target case instead of adding a duplicate case",
    ),
  );

  const protectedStatus = execFileSync(
    "git",
    ["status", "--porcelain", "--", "skills/sample-review"],
    { cwd: workspace, encoding: "utf8" },
  ).trim();
  checks.push(result(protectedStatus === "", "skills/sample-review must remain unchanged"));
  const caseStatus = execFileSync(
    "git",
    ["status", "--porcelain", "--", "evals/sample-review/cases/review-result.yaml"],
    { cwd: workspace, encoding: "utf8" },
  ).trim();
  checks.push(result(caseStatus !== "", "The existing target case must encode the new contract"));

  const commands = (context.trace?.spans ?? [])
    .filter(
      (span) =>
        span.attributes?.["codex.item.type"] === "command_execution" ||
        span.name?.startsWith("exec "),
    )
    .map((span) => span.attributes?.["codex.command"] ?? "");
  const ranCandidateEval = commands.some(
    (command) =>
      (/harness\/run\.mjs\s+all\b/i.test(command) ||
        /promptfoo\s+eval\b/i.test(command)) &&
      !/promptfoo\s+eval\s+--help\b/i.test(command),
  );
  checks.push(
    result(
      !ranCandidateEval && !commands.some((command) => /candidate-copy/i.test(command)),
      "Do not run a candidate model eval or create a candidate copy before the skill changes",
    ),
  );
  checks.push(result(!(await exists(path.join(workspace, "package.json"))), "Do not add package.json"));

  const pass = checks.every((check) => check.pass);
  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass ? "Contract-first preparation checks passed" : "Contract-first preparation checks failed",
    componentResults: checks,
  };
}
