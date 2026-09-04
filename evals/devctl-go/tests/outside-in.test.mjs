import assert from "node:assert/strict";
import test from "node:test";

import assertOutsideIn from "../harness/assert-outside-in.mjs";
import assertReferenceOrder from "../harness/assert-reference-order.mjs";

function traceBuilder() {
  let startTime = 0;
  const spans = [];
  return {
    change(files) {
      spans.push({
        startTime: startTime++,
        attributes: { "codex.item.type": "file_change", "codex.files": files },
      });
    },
    command(command, exitCode = 0, output = "") {
      spans.push({
        startTime: startTime++,
        attributes: {
          "codex.item.type": "command_execution",
          "codex.command": command,
          "codex.exit_code": exitCode,
          "codex.output": output,
        },
      });
    },
    spans,
  };
}

const PHASES = [
  {
    label: "CLI",
    testPathRegex: "cmd/runwatch/.*_test\\.go",
    commandRegex: "go test.*cmd/runwatch",
    productionPathRegex: "cmd/runwatch/(?!.*_test\\.go).*\\.go",
  },
  {
    label: "service",
    testPathRegex: "internal/service/task/.*_test\\.go",
    commandRegex: "go test.*internal/service/task",
    productionPathRegex: "internal/service/task/(?!.*_test\\.go).*\\.go",
  },
  {
    label: "repository",
    testPathRegex: "internal/repository/task/.*_test\\.go",
    commandRegex: "go test.*internal/repository/task",
    productionPathRegex: "internal/repository/task/(?!.*_test\\.go).*\\.go",
  },
  {
    label: "deps",
    testPathRegex: "internal/deps/.*_test\\.go",
    commandRegex: "go test.*internal/deps",
    productionPathRegex: "internal/deps/(?!.*_test\\.go).*\\.go",
  },
];

const REFERENCE_CONFIG = {
  anyChangeRegex: "^(cmd/runwatch/|internal/)",
  allowedReferences: [
    "code-principles.md",
    "testing-strategy.md",
    "project-structure.md",
    "cmd.md",
    "service.md",
    "repository.md",
    "io-boundaries-and-platform.md",
    "dependency-wiring.md",
  ],
  initialReferences: [
    "code-principles.md",
    "testing-strategy.md",
    "project-structure.md",
    "cmd.md",
  ],
  stages: [
    {
      label: "CLI",
      unlockProductionPathRegex: "cmd/runwatch/(?!.*_test\\.go).*\\.go",
      unlockCommandRegex: "go test.*cmd/runwatch",
      nextLabel: "service",
      nextTestPathRegex: "internal/service/task/.*_test\\.go",
      references: ["service.md"],
    },
    {
      label: "service",
      unlockProductionPathRegex: "internal/service/task/(?!.*_test\\.go).*\\.go",
      unlockCommandRegex: "go test.*internal/service/task",
      nextLabel: "repository",
      nextTestPathRegex: "internal/repository/task/.*_test\\.go",
      references: ["repository.md", "io-boundaries-and-platform.md"],
    },
    {
      label: "repository",
      unlockProductionPathRegex: "internal/repository/task/(?!.*_test\\.go).*\\.go",
      unlockCommandRegex: "go test.*internal/repository/task",
      nextLabel: "deps",
      nextTestPathRegex: "internal/deps/.*_test\\.go",
      references: ["dependency-wiring.md"],
    },
  ],
};

function validTrace() {
  const trace = traceBuilder();
  trace.command(
    "sed -n 1,200p references/code-principles.md references/testing-strategy.md " +
      "references/project-structure.md references/cmd.md",
  );
  trace.change("cmd/runwatch/internal/create_test.go");
  trace.command("go test ./cmd/runwatch/internal", 1, "undefined: NewCreateCommand");
  trace.change("cmd/runwatch/internal/create.go");
  trace.command("go test ./cmd/runwatch/internal");
  trace.command("sed -n 1,200p references/service.md");
  trace.change("internal/service/task/create_test.go");
  trace.command("go test ./internal/service/task", 1, "undefined: New");
  trace.change("internal/service/task/create.go");
  trace.command("go test ./internal/service/task");
  trace.command(
    "sed -n 1,200p references/repository.md references/io-boundaries-and-platform.md",
  );
  trace.change("internal/repository/task/create_test.go");
  trace.command("go test ./internal/repository/task", 1, "undefined: New");
  trace.change("internal/repository/task/create.go");
  trace.command("go test ./internal/repository/task");
  trace.command("sed -n 1,200p references/dependency-wiring.md");
  trace.change("internal/deps/deps_test.go");
  trace.command("go test ./internal/deps", 1, "runtime graph not implemented");
  trace.change("internal/deps/deps.go");
  trace.command("go test ./internal/deps");
  return trace.spans;
}

test("accepts separate outside-in RED and GREEN cycles with just-in-time references", () => {
  const spans = validTrace();
  const outsideIn = assertOutsideIn("", {
    trace: { spans },
    config: {
      allProductionRegex: "(cmd/runwatch/|internal/(service/task|repository/task|deps)/)(?!.*_test\\.go).*\\.go",
      forbiddenRedOutputRegex: "missing go.sum|syntax error",
      phases: PHASES,
    },
  });
  const references = assertReferenceOrder("", {
    trace: { spans },
    config: REFERENCE_CONFIG,
  });

  assert.equal(outsideIn.pass, true, outsideIn.reason);
  assert.equal(references.pass, true, references.reason);
});

test("rejects repository production before the caller-visible RED", () => {
  const spans = validTrace();
  spans.splice(1, 0, {
    startTime: 0.5,
    attributes: {
      "codex.item.type": "file_change",
      "codex.files": "internal/repository/task/create.go",
    },
  });
  const outcome = assertOutsideIn("", {
    trace: { spans },
    config: { allProductionRegex: ".*\\.go", phases: PHASES },
  });

  assert.equal(outcome.pass, false);
  assert.match(outcome.reason, /Production changed before|repository production changed/);
});

test("rejects a test and production implementation in one file-change step", () => {
  const spans = validTrace();
  spans[1].attributes["codex.files"] =
    "cmd/runwatch/internal/create_test.go\ncmd/runwatch/internal/create.go";
  const outcome = assertOutsideIn("", {
    trace: { spans },
    config: { allProductionRegex: ".*\\.go", phases: PHASES },
  });

  assert.equal(outcome.pass, false);
  assert.match(outcome.reason, /before or together/);
});

test("rejects lower and unrelated references loaded upfront", () => {
  const early = validTrace();
  early[0].attributes["codex.command"] += " references/repository.md";
  const earlyOutcome = assertReferenceOrder("", {
    trace: { spans: early },
    config: REFERENCE_CONFIG,
  });
  assert.equal(earlyOutcome.pass, false);
  assert.match(earlyOutcome.reason, /repository\.md must be read after service GREEN/);

  const unrelated = validTrace();
  unrelated[0].attributes["codex.command"] += " references/validation.md";
  const unrelatedOutcome = assertReferenceOrder("", {
    trace: { spans: unrelated },
    config: REFERENCE_CONFIG,
  });
  assert.equal(unrelatedOutcome.pass, false);
  assert.match(unrelatedOutcome.reason, /Read unrelated references: validation\.md/);
});

test("recognizes bare filenames after changing into the references directory", () => {
  const spans = validTrace();
  spans[0].attributes["codex.command"] =
    "cd .agents/skills/devctl-go/references && " +
    "sed -n '1,200p' code-principles.md testing-strategy.md project-structure.md cmd.md";
  const outcome = assertReferenceOrder("", {
    trace: { spans },
    config: REFERENCE_CONFIG,
  });

  assert.equal(outcome.pass, true, outcome.reason);
});
