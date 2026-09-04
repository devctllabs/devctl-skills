import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function result(pass, reason) {
  return { pass, score: pass ? 1 : 0, reason };
}

function git(workspace, args) {
  return execFileSync("git", args, { cwd: workspace, encoding: "utf8" });
}

function matchesAny(values, patterns = []) {
  return values.some((value) =>
    patterns.some((pattern) => new RegExp(pattern, "i").test(value)),
  );
}

function changedPaths(workspace) {
  return git(workspace, ["status", "--porcelain", "--untracked-files=all"])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).trim().split(" -> ").at(-1));
}

function workspacePaths(workspace) {
  const paths = git(workspace, ["ls-files", "--cached", "--others", "--exclude-standard"])
    .split(/\r?\n/)
    .filter(Boolean);
  const deleted = new Set(
    git(workspace, ["ls-files", "--deleted"])
      .split(/\r?\n/)
      .filter(Boolean),
  );
  return paths.filter((name) => !deleted.has(name));
}

function changedText(workspace, paths, include = () => true) {
  return paths
    .filter((name) => name.endsWith(".go") && include(name))
    .map((name) => {
      try {
        return readFileSync(path.join(workspace, name), "utf8");
      } catch {
        return "";
      }
    })
    .join("\n");
}

export default function assertCase(_output, context) {
  const workspace = context.vars?.workspaceDir;
  const config = context.config ?? {};
  if (!workspace) {
    return result(false, "workspaceDir is required");
  }

  const paths = changedPaths(workspace);
  const finalPaths = workspacePaths(workspace);
  const components = [result(paths.length > 0, "Candidate changed the target workspace")];

  for (const pattern of config.requiredPathRegexes ?? []) {
    components.push(
      result(matchesAny(paths, [pattern]), `Changed path matches ${pattern}`),
    );
  }

  for (const pattern of config.forbiddenPathRegexes ?? []) {
    components.push(
      result(!matchesAny(paths, [pattern]), `No changed path matches ${pattern}`),
    );
  }

  for (const pattern of config.requiredWorkspacePathRegexes ?? []) {
    components.push(
      result(matchesAny(finalPaths, [pattern]), `Workspace path matches ${pattern}`),
    );
  }

  for (const pattern of config.forbiddenWorkspacePathRegexes ?? []) {
    components.push(
      result(!matchesAny(finalPaths, [pattern]), `No workspace path matches ${pattern}`),
    );
  }

  if (config.allowedPathRegex) {
    const invalid = paths.filter((name) => !new RegExp(config.allowedPathRegex, "i").test(name));
    components.push(
      result(invalid.length === 0, invalid.length === 0 ? "Changed paths stay in scope" : `Out-of-scope changes: ${invalid.join(", ")}`),
    );
  }

  const text = changedText(workspace, paths);
  const productionText = changedText(workspace, paths, (name) => !name.endsWith("_test.go"));
  const testText = changedText(workspace, paths, (name) => name.endsWith("_test.go"));
  for (const pattern of config.requiredContentRegexes ?? []) {
    components.push(result(new RegExp(pattern, "is").test(text), `Changed Go contains ${pattern}`));
  }
  for (const pattern of config.forbiddenContentRegexes ?? []) {
    components.push(result(!new RegExp(pattern, "is").test(text), `Changed Go excludes ${pattern}`));
  }
  for (const pattern of config.requiredProductionContentRegexes ?? []) {
    components.push(
      result(
        new RegExp(pattern, "is").test(productionText),
        `Production Go contains ${pattern}`,
      ),
    );
  }
  for (const pattern of config.forbiddenProductionContentRegexes ?? []) {
    components.push(
      result(
        !new RegExp(pattern, "is").test(productionText),
        `Production Go excludes ${pattern}`,
      ),
    );
  }
  for (const pattern of config.requiredTestContentRegexes ?? []) {
    components.push(
      result(new RegExp(pattern, "is").test(testText), `Test Go contains ${pattern}`),
    );
  }
  for (const pattern of config.forbiddenTestContentRegexes ?? []) {
    components.push(
      result(!new RegExp(pattern, "is").test(testText), `Test Go excludes ${pattern}`),
    );
  }

  for (const rule of config.fileContentRules ?? []) {
    let fileText = "";
    try {
      fileText = readFileSync(path.join(workspace, rule.path), "utf8");
    } catch {
      components.push(result(false, `Readable file ${rule.path}`));
      continue;
    }
    for (const pattern of rule.requiredRegexes ?? []) {
      components.push(
        result(
          new RegExp(pattern, "is").test(fileText),
          `${rule.path} contains ${pattern}`,
        ),
      );
    }
    for (const pattern of rule.forbiddenRegexes ?? []) {
      components.push(
        result(
          !new RegExp(pattern, "is").test(fileText),
          `${rule.path} excludes ${pattern}`,
        ),
      );
    }
  }

  const test = spawnSync("go", ["test", "./..."], {
    cwd: workspace,
    encoding: "utf8",
    env: {
      ...process.env,
      GOCACHE: path.join(os.tmpdir(), "devctl-go-evals-gocache"),
      GOFLAGS: "-mod=readonly -p=1",
      GOMAXPROCS: "2",
    },
    shell: false,
    timeout: 60_000,
  });
  components.push(
    result(
      test.status === 0,
      test.status === 0
        ? "go test ./... passed"
        : `go test ./... failed (${test.status ?? "no status"})\n${test.stdout}\n${test.stderr}`,
    ),
  );

  const pass = components.every((component) => component.pass);
  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass ? "Go implementation hard gates passed" : "Go implementation hard gates failed",
    componentResults: components,
  };
}
