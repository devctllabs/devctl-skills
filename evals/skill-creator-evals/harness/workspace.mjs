import { execFileSync } from "node:child_process";
import { constants } from "node:fs";
import { access, cp, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const EVIDENCE_LIMIT = 100_000;
const UNTRACKED_FILE_LIMIT = 20_000;

function git(workspace, args) {
  return execFileSync("git", args, { cwd: workspace, encoding: "utf8" });
}

function bounded(value, limit = EVIDENCE_LIMIT) {
  const text = value || "";
  return text.length <= limit ? text : `${text.slice(0, limit)}\n[truncated]`;
}

async function collectUntracked(workspace) {
  const names = git(workspace, ["ls-files", "--others", "--exclude-standard", "-z"])
    .split("\0")
    .filter(Boolean);
  const result = {};
  for (const name of names) {
    try {
      if ((await lstat(path.join(workspace, name))).isSymbolicLink()) {
        result[name] = "[symlink omitted]";
        continue;
      }
      result[name] = bounded(await readFile(path.join(workspace, name), "utf8"), UNTRACKED_FILE_LIMIT);
    } catch {
      result[name] = "[binary or unreadable]";
    }
  }
  return result;
}

function resolveInput(relativeOrAbsolute) {
  return path.resolve(process.cwd(), relativeOrAbsolute);
}

async function findExecutable(name) {
  if (!/^[A-Za-z0-9._+-]+$/.test(name)) {
    throw new Error(`Invalid executable name: ${name}`);
  }
  for (const directory of (process.env.PATH ?? "").split(path.delimiter)) {
    const candidate = path.join(directory, name);
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next PATH entry.
    }
  }
  throw new Error(`Required executable is not available: ${name}`);
}

async function prepare(context) {
  const vars = context.test.vars ?? {};
  if (!vars.fixtureDir || !vars.targetSkillDir || !vars.targetSkillName) {
    throw new Error("fixtureDir, targetSkillDir, and targetSkillName are required");
  }

  const fixture = resolveInput(vars.fixtureDir);
  const targetSkill = resolveInput(vars.targetSkillDir);
  await readFile(path.join(targetSkill, "SKILL.md"), "utf8");

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "skill-creator-evals-"));
  try {
    const workspace = path.join(tempRoot, "workspace");
    await cp(fixture, workspace, { recursive: true });
    try {
      await lstat(path.join(workspace, ".git"));
      throw new Error("Fixtures must not contain .git metadata");
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    const toolDirectory = path.join(workspace, ".skill-creator-evals-bin");
    await mkdir(toolDirectory, { recursive: true });
    const toolExecutables =
      typeof vars.toolExecutables === "string"
        ? vars.toolExecutables
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean)
        : [];
    if (vars.toolExecutables !== undefined && typeof vars.toolExecutables !== "string") {
      throw new Error("toolExecutables must be a comma-separated string");
    }
    for (const name of toolExecutables) {
      await symlink(await findExecutable(name), path.join(toolDirectory, name));
    }

    const injectedSkill = path.join(workspace, ".agents", "skills", vars.targetSkillName);
    await mkdir(path.dirname(injectedSkill), { recursive: true });
    try {
      await readdir(injectedSkill);
      throw new Error(`Fixture already contains target skill: ${injectedSkill}`);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    await cp(targetSkill, injectedSkill, { recursive: true });

    git(workspace, ["init", "--quiet"]);
    git(workspace, ["config", "user.name", "Skill Creator Evals"]);
    git(workspace, ["config", "user.email", "skill-creator-evals@example.invalid"]);
    const hooksDirectory = path.join(tempRoot, "git-hooks");
    await mkdir(hooksDirectory, { recursive: true });
    git(workspace, ["config", "core.hooksPath", hooksDirectory]);
    git(workspace, ["config", "commit.gpgsign", "false"]);
    git(workspace, ["add", "--all"]);
    git(workspace, ["commit", "--quiet", "-m", "fixture baseline"]);
    process.stdout.write(`START ${context.test.description ?? "unnamed case"}\n`);

    return {
      test: {
        ...context.test,
        vars: {
          ...vars,
          workspaceDir: workspace,
          skillCreatorEvalsTempRoot: tempRoot,
        },
      },
    };
  } catch (error) {
    await rm(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

async function collectAndCleanup(context) {
  const workspace = context.test.vars?.workspaceDir;
  const tempRoot = context.test.vars?.skillCreatorEvalsTempRoot;
  if (!workspace || !tempRoot) {
    return;
  }

  const evidence = {
    gitStatus: bounded(git(workspace, ["status", "--short"])),
    gitDiff: bounded(git(workspace, ["diff", "--no-ext-diff", "HEAD", "--"])),
    untrackedFiles: await collectUntracked(workspace),
  };
  const keep = process.env.SKILL_CREATOR_EVALS_KEEP_WORKSPACES === "1";
  if (keep) {
    evidence.retainedWorkspace = workspace;
  } else {
    const expectedPrefix = path.join(os.tmpdir(), "skill-creator-evals-");
    if (!tempRoot.startsWith(expectedPrefix)) {
      throw new Error(`Refusing to remove unexpected temp directory: ${tempRoot}`);
    }
    try {
      await rm(tempRoot, { recursive: true, force: true });
    } catch (error) {
      evidence.cleanupError = error.message;
    }
  }

  context.result.metadata = { ...(context.result.metadata ?? {}), skillCreatorEvals: evidence };
  process.stdout.write(`DONE ${context.test.description ?? "unnamed case"}\n`);
}

export async function workspaceHook(hookName, context) {
  if (hookName === "beforeEach") {
    return prepare(context);
  }
  if (hookName === "afterEach") {
    await collectAndCleanup(context);
    return undefined;
  }
  return undefined;
}
