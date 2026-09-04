import { spawnSync } from "node:child_process";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CHECKER = path.join(path.dirname(fileURLToPath(import.meta.url)), "checks.py");

function component(pass, reason) {
  return { pass, score: pass ? 1 : 0, reason };
}

function gitStatus(workspace) {
  return execFileSync("git", ["status", "--porcelain"], {
    cwd: workspace,
    encoding: "utf8",
  }).trim();
}

function checkReadOnly(workspace, results) {
  const status = gitStatus(workspace);
  results.push(
    component(status.length === 0, status.length === 0 ? "Workspace is unchanged" : status),
  );
}

export function qualityHotspots(_output, workspace) {
  const results = [];
  checkReadOnly(workspace, results);
  return results;
}

function pythonCase(caseName, workspace) {
  const child = spawnSync("python3", [CHECKER, caseName, workspace], {
    encoding: "utf8",
    shell: false,
    timeout: 60_000,
  });
  if (child.status !== 0) {
    return [
      component(
        false,
        [
          `Checker exited ${child.status ?? "without status"}`,
          child.stdout,
          child.stderr,
          child.error?.message,
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    ];
  }
  try {
    const payload = JSON.parse(child.stdout);
    return payload.results.map((item) => component(item.pass, item.reason));
  } catch (error) {
    return [component(false, `Invalid checker output: ${error.message}\n${child.stdout}`)];
  }
}

export default function assertCase(output, context) {
  const workspace = context.vars.workspaceDir;
  const caseName = context.config?.caseName;
  if (!workspace || !caseName) {
    return { pass: false, score: 0, reason: "workspaceDir and caseName are required" };
  }

  let results;
  if (caseName === "quality-hotspots-readonly") {
    results = qualityHotspots(output, workspace);
  } else {
    results = pythonCase(caseName, workspace);
  }

  const pass = results.length > 0 && results.every((result) => result.pass);
  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass ? `${caseName} hard gates passed` : `${caseName} hard gates failed`,
    componentResults: results,
  };
}
