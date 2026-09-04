---
name: outside-in-tdd
description: Drive outside-in TDD for handwritten production behavior. Use when planning or implementing a feature, fixing a bug regression-first, evolving a public contract, performing a behavior-preserving refactor, or when another skill needs scenario-sized RED/GREEN/SIMPLIFY checkpoints.
---

# Outside-in TDD

Grow behavior from its highest affected caller-visible owner. Keep every cycle small, observable,
and GREEN before moving inward or onward.

## Select the Change Path

1. Inspect repository conventions, generated boundaries, current changes, behavior owners, and the
   narrow and full verification commands. Complete inspection when the first owner, first scenario,
   expected checkpoint, and narrow command are known.
2. Select one path:
   - New behavior: begin with the smallest caller-visible scenario.
   - Bug: begin with a regression test that fails for the reported behavior.
   - Behavior- and contract-preserving refactor: run the exact owner characterization GREEN
     immediately before changing production; RED is not required.
   - Public-contract change: establish the old behavior GREEN, express the new contract in its owner
     test, reach useful RED, and migrate all in-repository callers. Preserve compatibility only when
     the user explicitly requests and agrees on it.

## Choose Scenarios with ZOMBIES

Use ZOMBIES as a two-dimensional heuristic, not a linear checklist:

- Progress from `Zero` to `One` to `Many` or more complex behavior.
- At every useful step, consider `Boundary` behavior, the caller-facing `Interface`, and
  `Exceptional` behavior.
- Keep both `Scenarios` and production `Solutions` simple.

Existing tests count. Assign overlapping behavior to one owning scenario. Skip inapplicable cases;
explain only risky or non-obvious omissions. A cross-boundary test has one owner and does not replace
the direct suites of every component it crosses.

## Run the Cycle

Remain in this state machine for each scenario:

```text
TEST -> useful RED or natural GREEN -> minimum production -> GREEN -> SIMPLIFY -> GREEN
```

1. Change the owner test first. Add only a non-behavioral declaration or compile/import skeleton
   when the test cannot otherwise run. Complete the step on a useful RED caused by missing or wrong
   requested behavior, never unrelated syntax, import, collection, fixture, dependency, or
   configuration failure.
2. If prior minimum behavior makes the new scenario naturally GREEN, strengthen an insufficient
   test or continue without manufacturing a production change.
3. On useful RED, add only production demanded by that scenario. Complete the step when the same
   narrow owner check is GREEN.
4. After every scenario GREEN, you must invoke `$simplify-code`, read its `SKILL.md` completely,
   and follow it for the post-GREEN phase. If it is unavailable, stop and report the missing
   required skill; do not reproduce its workflow locally. Limit its scope to production changed by
   the current cycle and pass it the same owner check. A no-change audit is valid when the result is
   already simple; after any simplification edit, rerun the check to GREEN.
5. Finish applicable scenarios at the current owner before descending. Descend only when its GREEN
   behavior introduced a concrete consumer-owned contract that demands a lower implementation.

An upper RED may demand a narrow consumer-owned interface and test double, never speculative lower
production. Let the active language or framework skill define its concrete test layout, doubles,
integration boundaries, and commands.

## Recover and Finish

- If current-task production preceded its required test checkpoint, remove only that premature
  production, preserve pre-existing and user-authored work, and restart at the owner test.
- Keep generated output behind its generator and use the repository's drift checks.
- Before completion, run the direct suite for every changed behavior owner, then the configured full
  test and quality checks relevant to the change.
- Report the first RED or characterization GREEN, its GREEN result, simplification outcome, and the
  final commands actually run. Finish only when every changed owner is GREEN and no speculative
  production remains.
