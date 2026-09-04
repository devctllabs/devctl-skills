---
name: simplify-code
description: Simplify code while preserving observable behavior and public contracts. Use when reducing cognitive complexity in a function, complex section, module, or current change set, or when another skill needs a post-GREEN simplification phase.
---

# Simplify Code

Reduce the effort required to understand and change code. Use behavior-preserving refactoring as
the technique and lower cognitive complexity as the outcome; line count alone is not the goal.

## Establish Scope and Safety

1. Inspect the requested function, section, module, or current change set together with its callers,
   tests, repository conventions, and current user-owned changes.
2. Set scope:
   - When invoked after a TDD GREEN, inherit only that scenario's production change and narrow owner
     check.
   - When invoked directly, use the function, section, or module named by the user. Treat adjacent
     issues as findings, not implicit scope.
3. Name the observable behavior and public contracts that must remain stable. Run the narrowest
   adequate check GREEN before changing production.
4. When the safety net is inadequate, add black-box characterization at the nearest stable public
   boundary and run it GREEN. If a safe, deterministic behavior oracle cannot be established, stop
   without changing production and report the gap.

## Simplify Under GREEN

Look for concrete reductions in:

- nested control flow and branch count;
- duplicated decisions or transformations;
- indirection that hides rather than separates responsibility;
- abstractions, wrappers, configuration, or generality without a current caller;
- scattered state and unclear data flow;
- names or boundaries that make the current responsibility harder to see.

Choose the smallest coherent refactor with a clear cognitive-complexity gain. Inline, extract,
collapse, reorder, rename, or reshape private implementation when that makes the behavior easier to
follow. Preserve local style and do not trade structure for dense expressions or code golf.

After each coherent production edit, rerun the same narrow check. Revert or correct an edit when the
behavior oracle changes. Stop when the remaining candidates lack a clear simplicity gain.

## Keep Tests as an Oracle

- Freeze observable assertions and public contracts during production simplification.
- Let private functions, internal types, and module structure change when public behavior stays
  GREEN.
- When a test is coupled to obsolete private structure, first secure equivalent coverage at a
  stable boundary. Then adapt or remove the structural test in a separate step and rerun the stable
  suite GREEN.
- Treat a requested public or observable behavior change as `$outside-in-tdd` work. Let that skill
  drive the new contract before resuming simplification; do not duplicate its RED/GREEN protocol
  here.

## Complete

Run every affected owner suite and the repository's relevant full checks. Report the scope, safety
net, concrete complexity reductions or valid no-change result, and commands actually run. Complete
only with public behavior GREEN, no out-of-scope cleanup, and no new abstraction without a current
responsibility.
