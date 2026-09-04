import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function result(pass, reason) {
  return { pass, score: pass ? 1 : 0, reason };
}

export default function assertSimplification(_output, context) {
  const workspace = context.vars?.workspaceDir;
  const config = context.config ?? {};
  if (!workspace || !config.sourcePath || !config.testPath) {
    return result(false, "workspaceDir, sourcePath, and testPath are required");
  }

  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "python-complexity.py");
  const source = path.join(workspace, config.sourcePath);
  const measured = spawnSync("python3", [script, source], { encoding: "utf8", shell: false });
  if (measured.status !== 0) {
    return result(false, `Complexity measurement failed:\n${measured.stderr}`);
  }

  const metrics = JSON.parse(measured.stdout);
  const tests = readFileSync(path.join(workspace, config.testPath), "utf8");
  const components = [
    result(
      metrics.decision_nodes <= config.maxDecisionNodes,
      `decision_nodes=${metrics.decision_nodes}, required <=${config.maxDecisionNodes}`,
    ),
    result(
      metrics.max_nesting <= config.maxNesting,
      `max_nesting=${metrics.max_nesting}, required <=${config.maxNesting}`,
    ),
    result(!/\b_quote\b/.test(tests), "Tests exercise the public API rather than _quote"),
  ];
  const pass = components.every((component) => component.pass);
  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass ? "Simplification hard gates passed" : "Simplification hard gates failed",
    componentResults: components,
  };
}
