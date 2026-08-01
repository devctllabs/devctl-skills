import assert from "node:assert/strict";
import test from "node:test";

import assertTrajectory from "../harness/assert-trajectory.mjs";
import assertSkillUsed from "../harness/assert-skill-used.mjs";

function fileChange(startTime, files) {
  return {
    name: "file change",
    startTime,
    attributes: {
      "codex.item.type": "file_change",
      "codex.files": files,
    },
  };
}

function command(startTime, value, exitCode, output = "") {
  return {
    name: "exec python3",
    startTime,
    attributes: {
      "codex.item.type": "command_execution",
      "codex.command": value,
      "codex.exit_code": exitCode,
      "codex.output": output,
    },
  };
}

function evaluate(spans, phases) {
  return assertTrajectory("", {
    trace: { spans },
    config: { phases },
  });
}

const servicePhase = {
  label: "service",
  mode: "tdd",
  testPathRegex: "tests/unit/service",
  commandRegex: "python3.*unittest.*service",
  productionPathRegex: "src/catalog/service\\.py",
};

test("accepts a useful RED followed by production and GREEN", () => {
  const result = evaluate(
    [
      fileChange(1, "tests/unit/service/test_catalog_service.py"),
      command(2, "python3 -m unittest tests.unit.service", 1, "AssertionError: expected item"),
      fileChange(3, "src/catalog/service.py"),
      command(4, "python3 -m unittest tests.unit.service", 0, "OK"),
    ],
    [servicePhase],
  );

  assert.equal(result.pass, true, result.reason);
});

test("accepts consecutive scenario cycles in the same files", () => {
  const phases = [
    { ...servicePhase, label: "service success" },
    { ...servicePhase, label: "service invalid input" },
  ];
  const result = evaluate(
    [
      fileChange(1, "tests/unit/service/test_catalog_service.py"),
      command(2, "python3 -m unittest tests.unit.service", 1, "AssertionError: expected item"),
      fileChange(3, "src/catalog/service.py"),
      command(4, "python3 -m unittest tests.unit.service", 0, "OK"),
      fileChange(5, "tests/unit/service/test_catalog_service.py"),
      command(6, "python3 -m unittest tests.unit.service", 1, "AssertionError: expected error"),
      fileChange(7, "src/catalog/service.py"),
      command(8, "python3 -m unittest tests.unit.service", 0, "OK"),
    ],
    phases,
  );

  assert.equal(result.pass, true, result.reason);
});

test("accepts a production refactor followed by a confirming GREEN", () => {
  const phases = [
    { ...servicePhase, label: "service success" },
    { ...servicePhase, label: "service invalid input" },
  ];
  const result = evaluate(
    [
      fileChange(1, "tests/unit/service/test_catalog_service.py"),
      command(2, "python3 -m unittest tests.unit.service", 1, "AssertionError"),
      fileChange(3, "src/catalog/service.py"),
      command(4, "python3 -m unittest tests.unit.service", 0, "OK"),
      fileChange(5, "src/catalog/service.py"),
      command(6, "python3 -m unittest tests.unit.service", 0, "OK"),
      fileChange(7, "tests/unit/service/test_catalog_service.py"),
      command(8, "python3 -m unittest tests.unit.service", 1, "AssertionError"),
      fileChange(9, "src/catalog/service.py"),
      command(10, "python3 -m unittest tests.unit.service", 0, "OK"),
    ],
    phases,
  );

  assert.equal(result.pass, true, result.reason);
  assert.match(result.reason, /refactor -> GREEN/);
});

test("accepts a no-op refactor checkpoint without an artificial file change", () => {
  const result = evaluate(
    [
      fileChange(1, "tests/unit/service/test_catalog_service.py"),
      command(2, "python3 -m unittest tests.unit.service", 1, "AssertionError"),
      fileChange(3, "src/catalog/service.py"),
      command(4, "python3 -m unittest tests.unit.service", 0, "OK"),
    ],
    [servicePhase],
  );

  assert.equal(result.pass, true, result.reason);
});

test("rejects a post-GREEN refactor without a confirming GREEN", () => {
  const phases = [
    { ...servicePhase, label: "service success" },
    { ...servicePhase, label: "service invalid input" },
  ];
  const result = evaluate(
    [
      fileChange(1, "tests/unit/service/test_catalog_service.py"),
      command(2, "python3 -m unittest tests.unit.service", 1, "AssertionError"),
      fileChange(3, "src/catalog/service.py"),
      command(4, "python3 -m unittest tests.unit.service", 0, "OK"),
      fileChange(5, "src/catalog/service.py"),
      fileChange(6, "tests/unit/service/test_catalog_service.py"),
      command(7, "python3 -m unittest tests.unit.service", 1, "AssertionError"),
      fileChange(8, "src/catalog/service.py"),
      command(9, "python3 -m unittest tests.unit.service", 0, "OK"),
    ],
    phases,
  );

  assert.equal(result.pass, false);
  assert.match(result.reason, /changed after GREEN without/);
});

test("rejects production-first work in a later same-file scenario", () => {
  const phases = [
    { ...servicePhase, label: "service success" },
    { ...servicePhase, label: "service invalid input" },
  ];
  const result = evaluate(
    [
      fileChange(1, "tests/unit/service/test_catalog_service.py"),
      command(2, "python3 -m unittest tests.unit.service", 1, "AssertionError"),
      fileChange(3, "src/catalog/service.py"),
      command(4, "python3 -m unittest tests.unit.service", 0, "OK"),
      fileChange(5, "src/catalog/service.py"),
      fileChange(6, "tests/unit/service/test_catalog_service.py"),
      command(7, "python3 -m unittest tests.unit.service", 1, "AssertionError"),
      fileChange(8, "src/catalog/service.py"),
      command(9, "python3 -m unittest tests.unit.service", 0, "OK"),
    ],
    phases,
  );

  assert.equal(result.pass, false);
  assert.match(result.reason, /changed after GREEN without|production changed before/);
});

test("rejects production-first work even when a later RED-GREEN sequence exists", () => {
  const result = evaluate(
    [
      fileChange(1, "src/catalog/service.py"),
      fileChange(2, "tests/unit/service/test_catalog_service.py"),
      command(3, "python3 -m unittest tests.unit.service", 1, "AssertionError"),
      fileChange(4, "src/catalog/service.py"),
      command(5, "python3 -m unittest tests.unit.service", 0, "OK"),
    ],
    [servicePhase],
  );

  assert.equal(result.pass, false);
  assert.match(result.reason, /production changed before/);
});

test("rejects an already-green command presented as RED", () => {
  const result = evaluate(
    [
      fileChange(1, "tests/unit/service/test_catalog_service.py"),
      command(2, "python3 -m unittest tests.unit.service", 0, "OK"),
      fileChange(3, "src/catalog/service.py"),
      command(4, "python3 -m unittest tests.unit.service", 0, "OK"),
    ],
    [servicePhase],
  );

  assert.equal(result.pass, false);
  assert.match(result.reason, /already GREEN before a useful RED/);
});

test("rejects a combined test and production patch before RED", () => {
  const result = evaluate(
    [
      fileChange(
        1,
        "tests/unit/service/test_catalog_service.py, src/catalog/service.py",
      ),
      command(2, "python3 -m unittest tests.unit.service", 1, "AssertionError"),
      fileChange(3, "src/catalog/service.py"),
      command(4, "python3 -m unittest tests.unit.service", 0, "OK"),
    ],
    [servicePhase],
  );

  assert.equal(result.pass, false);
  assert.match(result.reason, /production changed before/);
});

test("rejects import and fixture failures as useful RED", () => {
  const result = evaluate(
    [
      fileChange(1, "tests/unit/service/test_catalog_service.py"),
      command(
        2,
        "python3 -m unittest tests.unit.service",
        1,
        "ModuleNotFoundError: No module named catalog",
      ),
      fileChange(3, "src/catalog/service.py"),
      command(4, "python3 -m unittest tests.unit.service", 0, "OK"),
    ],
    [servicePhase],
  );

  assert.equal(result.pass, false);
  assert.match(result.reason, /production changed before/);
});

test("accepts a corrected infrastructure command before useful RED", () => {
  const result = evaluate(
    [
      fileChange(1, "tests/unit/service/test_catalog_service.py"),
      command(
        2,
        "python3 -m unittest tests.unit.service",
        1,
        "ModuleNotFoundError: No module named catalog",
      ),
      command(3, "python3 -m unittest tests.unit.service", 1, "AssertionError"),
      fileChange(4, "src/catalog/service.py"),
      command(5, "python3 -m unittest tests.unit.service", 0, "OK"),
    ],
    [servicePhase],
  );

  assert.equal(result.pass, true, result.reason);
});

test("rejects lower-layer production before its outside-in RED", () => {
  const phases = [
    {
      label: "CLI",
      mode: "tdd",
      testPathRegex: "tests/unit/cli",
      commandRegex: "python3.*unittest.*cli",
      productionPathRegex: "src/catalog/cli\\.py",
      forbiddenProductionPathRegex: "src/catalog/(cli|service|repository)\\.py",
    },
    {
      ...servicePhase,
      forbiddenProductionPathRegex: "src/catalog/(service|repository)\\.py",
    },
  ];
  const result = evaluate(
    [
      fileChange(1, "tests/unit/cli/test_catalog_cli.py"),
      command(2, "python3 -m unittest tests.unit.cli", 1, "AssertionError"),
      fileChange(3, "src/catalog/cli.py"),
      fileChange(4, "src/catalog/repository.py"),
      command(5, "python3 -m unittest tests.unit.cli", 0, "OK"),
      fileChange(6, "tests/unit/service/test_catalog_service.py"),
      command(7, "python3 -m unittest tests.unit.service", 1, "AssertionError"),
      fileChange(8, "src/catalog/service.py"),
      command(9, "python3 -m unittest tests.unit.service", 0, "OK"),
    ],
    phases,
  );

  assert.equal(result.pass, false);
  assert.match(result.reason, /lower production boundary|service production changed before/);
});

test("accepts GREEN characterization before a pure refactor", () => {
  const result = evaluate(
    [
      fileChange(1, "tests/unit/cli/test_admin_cli.py"),
      command(2, "python3 -m unittest tests.unit.cli", 0, "OK"),
      fileChange(3, "src/admin_cli/cli/main.py"),
      command(4, "python3 -m unittest tests.unit.cli", 0, "OK"),
    ],
    [
      {
        label: "CLI characterization",
        mode: "characterization",
        testPathRegex: "tests/unit/cli",
        commandRegex: "python3.*unittest.*cli",
        productionPathRegex: "src/admin_cli/cli",
      },
    ],
  );

  assert.equal(result.pass, true, result.reason);
});

test("accepts a corrected characterization command before production", () => {
  const result = evaluate(
    [
      fileChange(1, "tests/unit/cli/test_admin_cli.py"),
      command(
        2,
        "python3 -m unittest discover -s tests",
        1,
        "ModuleNotFoundError: No module named admin_cli",
      ),
      command(3, "PYTHONPATH=src python3 -m unittest discover -s tests", 0, "OK"),
      fileChange(4, "src/admin_cli/cli/main.py"),
      command(5, "PYTHONPATH=src python3 -m unittest discover -s tests", 0, "OK"),
    ],
    [
      {
        label: "CLI characterization",
        mode: "characterization",
        testPathRegex: "tests/unit/cli",
        commandRegex: "python3.*unittest",
        productionPathRegex: "src/admin_cli/cli",
      },
    ],
  );

  assert.equal(result.pass, true, result.reason);
});

test("recognizes absolute and relative skill reads from command traces", () => {
  for (const commandValue of [
    "sed -n '1,200p' .agents/skills/devctl-python/SKILL.md",
    "sed -n '1,200p' /tmp/workspace/.agents/skills/devctl-python/SKILL.md",
  ]) {
    const result = assertSkillUsed("", {
      config: { skillName: "devctl-python" },
      trace: { spans: [command(1, commandValue, 0)] },
    });
    assert.equal(result.pass, true, result.reason);
  }
  const missing = assertSkillUsed("", {
    config: { skillName: "devctl-python" },
    trace: { spans: [command(1, "sed -n '1,200p' README.md", 0)] },
  });
  assert.equal(missing.pass, false);
});
