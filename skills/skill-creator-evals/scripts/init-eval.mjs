#!/usr/bin/env node

import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!["--name", "--target", "--output"].includes(flag) || !value) {
      throw new Error(
        "Usage: init-eval.mjs --name <skill-name> --target <skill-dir> --output <eval-dir>",
      );
    }
    values[flag.slice(2)] = value;
  }
  if (!values.name || !values.target || !values.output) {
    throw new Error(
      "Usage: init-eval.mjs --name <skill-name> --target <skill-dir> --output <eval-dir>",
    );
  }
  if (!SKILL_NAME_PATTERN.test(values.name)) {
    throw new Error(`Invalid skill name: ${values.name}`);
  }
  return values;
}

async function pathExists(candidate) {
  try {
    await stat(candidate);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function renderDirectory(directory, replacements) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await renderDirectory(entryPath, replacements);
      continue;
    }
    let content = await readFile(entryPath, "utf8");
    for (const [placeholder, value] of Object.entries(replacements)) {
      content = content.replaceAll(placeholder, value);
    }
    await writeFile(entryPath, content);
  }
}

export async function initializeEval({ name, target, output }, cwd = process.cwd()) {
  const outputDirectory = path.resolve(cwd, output);
  if (await pathExists(outputDirectory)) {
    throw new Error(`Refusing to overwrite existing eval directory: ${outputDirectory}`);
  }

  const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
  const templateDirectory = path.resolve(scriptDirectory, "../assets/eval-template");
  const targetDirectory = path.resolve(cwd, target);
  const relativeTarget = path
    .relative(outputDirectory, targetDirectory)
    .split(path.sep)
    .join("/");

  await mkdir(path.dirname(outputDirectory), { recursive: true });
  try {
    await cp(templateDirectory, outputDirectory, { recursive: true, errorOnExist: true });
    await renderDirectory(outputDirectory, {
      __SKILL_NAME__: name,
      __TARGET_SKILL_DIR__: relativeTarget,
    });
  } catch (error) {
    await rm(outputDirectory, { recursive: true, force: true });
    throw error;
  }
  return outputDirectory;
}

export async function main(argv = process.argv.slice(2)) {
  const outputDirectory = await initializeEval(parseArgs(argv));
  process.stdout.write(`Created eval suite: ${outputDirectory}\n`);
}

const isEntrypoint =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isEntrypoint) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
