import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

function result(pass, reason) {
  return { pass, score: pass ? 1 : 0, reason };
}

function changedPaths(workspace) {
  return execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
    cwd: workspace,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).trim().split(" -> ").at(-1));
}

export default function assertPythonCase(_output, context) {
  const workspace = context.vars?.workspaceDir;
  const config = context.config ?? {};
  if (!workspace) {
    return result(false, "workspaceDir is required");
  }

  const changed = changedPaths(workspace);
  const components = [result(changed.length > 0, "Candidate changed the target workspace")];
  if (config.allowedPathRegex) {
    const expression = new RegExp(config.allowedPathRegex, "i");
    const invalid = changed.filter((name) => !expression.test(name));
    components.push(
      result(
        invalid.length === 0,
        invalid.length === 0 ? "Changed paths stay in scope" : `Out-of-scope changes: ${invalid.join(", ")}`,
      ),
    );
  }
  for (const pattern of config.requiredPathRegexes ?? []) {
    const expression = new RegExp(pattern, "i");
    components.push(result(changed.some((name) => expression.test(name)), `Changed path matches ${pattern}`));
  }
  for (const rule of config.fileContentRules ?? []) {
    let content;
    try {
      content = readFileSync(path.join(workspace, rule.path), "utf8");
    } catch {
      components.push(result(false, `Readable file ${rule.path}`));
      continue;
    }
    for (const pattern of rule.requiredRegexes ?? []) {
      components.push(result(new RegExp(pattern, "ms").test(content), `${rule.path} contains ${pattern}`));
    }
    for (const pattern of rule.forbiddenRegexes ?? []) {
      components.push(result(!new RegExp(pattern, "ms").test(content), `${rule.path} excludes ${pattern}`));
    }
  }

  const pass = components.every((component) => component.pass);
  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass ? "Python workspace hard gates passed" : "Python workspace hard gates failed",
    componentResults: components,
  };
}
