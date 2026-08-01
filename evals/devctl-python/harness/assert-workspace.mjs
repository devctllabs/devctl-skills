import { execFileSync } from "node:child_process";
import { access, readFile, realpath } from "node:fs/promises";
import path from "node:path";

function resolveInside(workspace, relativePath) {
  if (typeof relativePath !== "string" || path.isAbsolute(relativePath)) {
    throw new Error(`Expected a relative workspace path: ${relativePath}`);
  }
  const root = path.resolve(workspace);
  const candidate = path.resolve(root, relativePath);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Path escapes workspace: ${relativePath}`);
  }
  return candidate;
}

async function existsInside(workspace, relativePath) {
  const candidate = resolveInside(workspace, relativePath);
  try {
    await access(candidate);
    const root = await realpath(workspace);
    const actual = await realpath(candidate);
    if (actual !== root && !actual.startsWith(`${root}${path.sep}`)) {
      throw new Error(`Path resolves outside workspace: ${relativePath}`);
    }
    return true;
  } catch (error) {
    if (["ENOENT", "ENOTDIR"].includes(error.code)) {
      return false;
    }
    throw error;
  }
}

function gitStatus(workspace, protectedPath) {
  return execFileSync("git", ["status", "--porcelain", "--", protectedPath], {
    cwd: workspace,
    encoding: "utf8",
  }).trim();
}

export default async function assertWorkspace(_output, context) {
  const workspace = context.vars.workspaceDir;
  const config = context.config ?? {};
  if (!workspace) {
    return { pass: false, score: 0, reason: "workspaceDir is required" };
  }

  const results = [];
  for (const relativePath of config.requiredPaths ?? []) {
    const pass = await existsInside(workspace, relativePath);
    results.push({
      pass,
      score: pass ? 1 : 0,
      reason: `${relativePath} ${pass ? "exists" : "is missing"}`,
    });
  }
  for (const relativePath of config.forbiddenPaths ?? []) {
    const pass = !(await existsInside(workspace, relativePath));
    results.push({
      pass,
      score: pass ? 1 : 0,
      reason: `${relativePath} ${pass ? "is absent" : "must be absent"}`,
    });
  }
  for (const relativePath of config.unchangedPaths ?? []) {
    resolveInside(workspace, relativePath);
    const status = gitStatus(workspace, relativePath);
    const pass = status.length === 0;
    results.push({
      pass,
      score: pass ? 1 : 0,
      reason: pass ? `${relativePath} is unchanged` : `${relativePath} changed:\n${status}`,
    });
  }
  for (const [relativePath, expectedParts] of Object.entries(config.fileContains ?? {})) {
    if (!Array.isArray(expectedParts) || expectedParts.some((part) => typeof part !== "string")) {
      throw new Error(`fileContains.${relativePath} must be an array of strings`);
    }
    let content = "";
    try {
      if (!(await existsInside(workspace, relativePath))) {
        throw new Error("path is missing or resolves outside workspace");
      }
      content = await readFile(resolveInside(workspace, relativePath), "utf8");
    } catch (error) {
      results.push({
        pass: false,
        score: 0,
        reason: `Cannot read ${relativePath}: ${error.message}`,
      });
      continue;
    }
    for (const expected of expectedParts) {
      const pass = content.includes(expected);
      results.push({
        pass,
        score: pass ? 1 : 0,
        reason: `${relativePath} ${pass ? "contains" : "does not contain"} ${JSON.stringify(expected)}`,
      });
    }
  }

  if (results.length === 0) {
    return { pass: false, score: 0, reason: "At least one workspace check is required" };
  }
  const pass = results.every((result) => result.pass);
  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass ? "Workspace checks passed" : "Workspace checks failed",
    componentResults: results,
  };
}
