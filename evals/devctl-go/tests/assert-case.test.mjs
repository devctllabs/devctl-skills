import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import assertCase from "../harness/assert-case.mjs";

async function fixture(source) {
  const root = await mkdtemp(path.join(os.tmpdir(), "devctl-go-checker-"));
  await writeFile(path.join(root, "go.mod"), "module example.com/checker\n\ngo 1.26\n");
  await mkdir(path.join(root, "internal", "service"), { recursive: true });
  await writeFile(path.join(root, "internal", "service", "service.go"), source);
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: root });
  execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: root });
  execFileSync("git", ["add", "go.mod"], { cwd: root });
  execFileSync("git", ["commit", "--quiet", "-m", "baseline"], { cwd: root });
  return root;
}

test("accepts an in-scope compiling implementation", async () => {
  const root = await fixture("package service\n\ntype Repository interface { Save() error }\n");
  try {
    const result = assertCase("", {
      vars: { workspaceDir: root },
      config: {
        allowedPathRegex: "^internal/service/",
        requiredPathRegexes: ["internal/service/"],
        requiredContentRegexes: ["type\\s+Repository\\s+interface"],
      },
    });
    assert.equal(result.pass, true, result.reason);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects an out-of-scope or forbidden implementation", async () => {
  const root = await fixture("package service\n\nimport \"os\"\n\nvar _ = os.Args\n");
  try {
    const result = assertCase("", {
      vars: { workspaceDir: root },
      config: {
        allowedPathRegex: "^internal/domain/",
        forbiddenContentRegexes: ["\\\"os\\\""],
      },
    });
    assert.equal(result.pass, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("matches a modified first path and non-final untracked paths independently", async () => {
  const root = await fixture("package service\n");
  try {
    execFileSync("git", ["add", "internal/service/service.go"], { cwd: root });
    execFileSync("git", ["commit", "--quiet", "-m", "service baseline"], { cwd: root });
    await writeFile(
      path.join(root, "internal", "service", "service.go"),
      "package service\n\ntype Service struct{}\n",
    );
    await writeFile(path.join(root, "internal", "service", "service_test.go"), "package service\n");
    await mkdir(path.join(root, "zz-last"));
    await writeFile(path.join(root, "zz-last", "other.go"), "package zzlast\n");

    const result = assertCase("", {
      vars: { workspaceDir: root },
      config: {
        allowedPathRegex: "^(internal/service/|zz-last/)",
        requiredPathRegexes: [
          "internal/service/service\\.go$",
          "internal/service/service_test\\.go$",
        ],
      },
    });

    assert.equal(result.pass, true, result.reason);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("requires naming conventions in production rather than owner tests", async () => {
  const root = await fixture("package service\n");
  try {
    await writeFile(
      path.join(root, "internal", "service", "service_test.go"),
      "package service\n\ntype Service struct{}\n",
    );

    const result = assertCase("", {
      vars: { workspaceDir: root },
      config: {
        allowedPathRegex: "^internal/service/",
        requiredProductionContentRegexes: ["type\\s+Service\\s+struct"],
      },
    });

    assert.equal(result.pass, false);
    assert.ok(
      result.componentResults.some(
        (component) =>
          component.pass === false && component.reason.includes("Production Go contains"),
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("checks test-specific required and forbidden content", async () => {
  const root = await fixture("package service\n");
  try {
    await writeFile(
      path.join(root, "internal", "service", "service_test.go"),
      `package service

import (
  "testing"

  "github.com/stretchr/testify/require"
)

func TestService(t *testing.T) { require.NoError(t, nil) }
`,
    );

    const accepted = assertCase("", {
      vars: { workspaceDir: root },
      config: {
        requiredTestContentRegexes: ["testify/require", "require\\.NoError"],
        forbiddenTestContentRegexes: ["t\\.Fatalf"],
      },
    });
    assert.equal(accepted.pass, false, "module intentionally lacks testify dependency");
    assert.ok(
      accepted.componentResults
        .filter((component) => component.reason.startsWith("Test Go"))
        .every((component) => component.pass),
    );

    const rejected = assertCase("", {
      vars: { workspaceDir: root },
      config: { forbiddenTestContentRegexes: ["require\\.NoError"] },
    });
    assert.equal(rejected.pass, false);
    assert.ok(
      rejected.componentResults.some(
        (component) =>
          component.pass === false && component.reason.includes("Test Go excludes"),
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("checks final workspace paths and file-specific content", async () => {
  const root = await fixture("package service\n");
  try {
    await mkdir(path.join(root, "cmd", "tool"), { recursive: true });
    await writeFile(
      path.join(root, "cmd", "tool", "main.go"),
      "package main\n\nimport \"os/signal\"\n\nvar _ = signal.NotifyContext\n",
    );

    const accepted = assertCase("", {
      vars: { workspaceDir: root },
      config: {
        allowedPathRegex: "^(internal/service/|cmd/tool/)",
        requiredWorkspacePathRegexes: ["cmd/tool/main\\.go$"],
        forbiddenWorkspacePathRegexes: ["cmd/tool/commands\\.go$"],
        fileContentRules: [
          {
            path: "cmd/tool/main.go",
            requiredRegexes: ["signal\\.NotifyContext"],
            forbiddenRegexes: ["internal/deps"],
          },
        ],
      },
    });
    assert.equal(accepted.pass, true, accepted.reason);

    const rejected = assertCase("", {
      vars: { workspaceDir: root },
      config: {
        requiredWorkspacePathRegexes: ["cmd/tool/missing\\.go$"],
        fileContentRules: [
          { path: "cmd/tool/main.go", forbiddenRegexes: ["signal\\.NotifyContext"] },
        ],
      },
    });
    assert.equal(rejected.pass, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
