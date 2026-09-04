import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const OUTPUT_LIMIT = 20_000;
const SAFE_ENV_KEYS = [
  "LANG",
  "LC_ALL",
  "PATH",
  "SHELL",
  "TMP",
  "TMPDIR",
  "TEMP",
  "TERM",
];

function bounded(value) {
  const text = value || "";
  return text.length <= OUTPUT_LIMIT ? text : `${text.slice(0, OUTPUT_LIMIT)}\n[truncated]`;
}

function safeEnvironment(context) {
  const tempRoot = context.vars.skillCreatorEvalsTempRoot;
  if (!tempRoot) {
    throw new Error("skillCreatorEvalsTempRoot is required");
  }
  const home = path.join(tempRoot, "command-home");
  const temporary = path.join(tempRoot, "command-tmp");
  mkdirSync(home, { recursive: true });
  mkdirSync(temporary, { recursive: true });
  return {
    ...Object.fromEntries(
      SAFE_ENV_KEYS.flatMap((key) =>
        process.env[key] === undefined ? [] : [[key, process.env[key]]],
      ),
    ),
    HOME: home,
    TMP: temporary,
    TMPDIR: temporary,
    TEMP: temporary,
    XDG_CACHE_HOME: path.join(home, ".cache"),
  };
}

export default function assertCommand(_output, context) {
  const workspace = context.vars.workspaceDir;
  const commands = context.config?.commands;
  if (!workspace || !Array.isArray(commands) || commands.length === 0) {
    return { pass: false, score: 0, reason: "workspaceDir and non-empty commands are required" };
  }

  const componentResults = commands.map((command) => {
    const argv = command.argv;
    if (!Array.isArray(argv) || argv.length === 0 || argv.some((item) => typeof item !== "string")) {
      return { pass: false, score: 0, reason: "Each command requires a non-empty argv string array" };
    }
    const result = spawnSync(argv[0], argv.slice(1), {
      cwd: workspace,
      encoding: "utf8",
      env: safeEnvironment(context),
      shell: false,
      timeout: command.timeoutMs ?? 60_000,
    });
    const pass = result.status === 0 && !result.error;
    const detail = [
      `$ ${argv.join(" ")}`,
      `exit: ${result.status ?? "none"}`,
      bounded(result.stdout),
      bounded(result.stderr),
      result.error?.message,
    ]
      .filter(Boolean)
      .join("\n");
    return { pass, score: pass ? 1 : 0, reason: detail };
  });

  const pass = componentResults.every((result) => result.pass);
  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass ? "All workspace commands passed" : "One or more workspace commands failed",
    componentResults,
  };
}
