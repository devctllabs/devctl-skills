import { execFileSync } from "node:child_process";
import { cp, mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EVAL_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

async function findGoMods(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await findGoMods(target)));
    } else if (entry.name === "go.mod") {
      found.push(target);
    }
  }
  return found;
}

export async function prefetchModules() {
  const modules = await findGoMods(path.join(EVAL_ROOT, "fixtures"));
  const seen = new Set();
  for (const goMod of modules) {
    const content = await readFile(goMod, "utf8");
    if (seen.has(content)) {
      continue;
    }
    seen.add(content);

    const temp = await mkdtemp(path.join(os.tmpdir(), "devctl-go-prefetch-"));
    try {
      await cp(goMod, path.join(temp, "go.mod"));
      const goSum = path.join(path.dirname(goMod), "go.sum");
      try {
        if ((await stat(goSum)).isFile()) {
          await cp(goSum, path.join(temp, "go.sum"));
        }
      } catch (error) {
        if (error.code !== "ENOENT") {
          throw error;
        }
      }
      execFileSync("go", ["mod", "download"], { cwd: temp, stdio: "inherit" });
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  }
  process.stdout.write(`Prefetched modules for ${modules.length} Go fixtures.\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await prefetchModules();
}
