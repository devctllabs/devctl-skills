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

function includesAll(text, values, results) {
  const normalized = text.toLowerCase();
  for (const value of values) {
    results.push(
      component(
        normalized.includes(value.toLowerCase()),
        normalized.includes(value.toLowerCase())
          ? `Response contains ${value}`
          : `Response is missing ${value}`,
      ),
    );
  }
}

export function qualityTooling(_output, workspace) {
  const results = [];
  checkReadOnly(workspace, results);
  return results;
}

export function qualityHotspots(output, workspace) {
  const results = [];
  checkReadOnly(workspace, results);
  includesAll(
    output,
    [
      "RunRepository",
      "tests/unit/service",
      "tests/integration/repository",
      "Boundary",
      "Exceptions",
      "rollback",
      "complexipy",
      "top 20",
      "D101",
      "D102",
    ],
    results,
  );
  return results;
}

export function outsideInPlan(output, workspace) {
  const results = [];
  checkReadOnly(workspace, results);
  includesAll(
    output,
    [
      "tests/unit/cli",
      "tests/unit/service",
      "tests/integration/repository",
      "zero",
      "one",
      "many",
      "boundary",
      "exceptions",
      "interfaces",
      "red",
      "green",
      "refactor",
      "protocol",
    ],
    results,
  );
  const normalized = output.toLowerCase();
  const categories = ["zero", "one", "many", "boundary", "exceptions", "interfaces"];
  let cursor = 0;
  const positions = categories.map((category) => {
    const position = normalized.indexOf(category, cursor);
    if (position >= 0) {
      cursor = position + category.length;
    }
    return position;
  });
  results.push(
    component(
      positions.every((position) => position >= 0),
      "The response states the scenario categories in the required order",
    ),
  );
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
  if (caseName === "quality-tooling-readonly") {
    results = qualityTooling(output, workspace);
  } else if (caseName === "quality-hotspots-readonly") {
    results = qualityHotspots(output, workspace);
  } else if (caseName === "outside-in-plan") {
    results = outsideInPlan(output, workspace);
  } else if (caseName === "catalog-remove-tdd") {
    results = pythonCase(caseName, workspace);
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
