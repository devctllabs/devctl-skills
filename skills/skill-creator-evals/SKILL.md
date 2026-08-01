---
name: skill-creator-evals
description: Use when creating, modifying, simplifying, or optimizing a local Codex skill with a contract-first Promptfoo suite, including requirements interviews, reusable cases, disposable fixtures, deterministic assertions, structured output, agent-rubric judges, trajectory checks, optimization measurements, approval gates, skill-creator handoff, focused failure diagnosis, and single-pass acceptance.
---

# Skill Creator Evals

Freeze executable acceptance behavior before changing a skill, then evaluate the changed skill.

## Workflow

1. Inspect the repository, target skill, neighboring skills, existing evals, available commands,
   and user-owned changes.
2. Read `references/workflow.md`, `references/eval-design.md`, and `references/promptfoo.md`
   completely.
3. Reuse existing cases whenever they cover the requested behavior. Update their requests,
   fixtures, assertions, and rubrics. Add a case only for a distinct behavior that the suite does
   not already protect.
4. Present the complete eval contract before changing the target skill. Include every request,
   fixture, deterministic assertion, judge rubric, trajectory requirement, side effect,
   optimization measurement, concurrency override, and expected post-change outcome. Wait for
   explicit approval.
5. Treat approval as freezing requests, fixtures, assertions, and pass rules. A mechanical repair
   may preserve the approved meaning; any semantic change requires renewed approval.
6. Before changing the target skill, permit only read-only inspection, deterministic checks, and
   approved optimization-baseline measurements that do not execute a candidate model eval. Do not
   run the current skill as a candidate or create a candidate copy.
7. Invoke `$skill-creator` to create or edit the target skill. Keep the approved eval semantics
   fixed while changing it.
8. Run the full suite once:

   ```text
   node evals/<skill-name>/harness/run.mjs all [--max-concurrency <N>]
   ```

   Every case runs once and Promptfoo uses `--repeat 1`.
9. Classify every failure as candidate, fixture/grader, judge variance, or runtime. Rerun only
   failed case descriptions while repairing them. When they pass, run one final `all`.
10. Finish with the target skill validator and repository checks requested by the user.

## Invariants

- Never weaken an approved eval while also changing the skill to satisfy it. Separate the changes
  and obtain renewed approval for any semantic eval revision.
- Stop target-skill changes and eval runs when repository evidence, explicit instructions, and the
  approved contract do not resolve a material conflict. Present the affected cases, viable
  decisions, tradeoffs, and a recommendation.
- Keep the candidate unaware of hidden rubrics, graders, expected patches, and prior conclusions.
- Permit candidate writes only inside disposable fixture workspaces. Replace external systems with
  recording fakes or controlled local services.
- Run the candidate without network access and the judge read-only.
- Treat deterministic assertions as hard gates and agent judges as semantic gates.
- Preserve raw evidence: task, response, diff, untracked files, command logs, traces, judge
  reasons, and resolved provider metadata.
- Do not use VIA for this workflow.

## Resources

- `scripts/init-eval.mjs` creates a missing suite from `assets/eval-template/`.
- `references/workflow.md` defines contract approval, skill handoff, failure diagnosis, and
  completion.
- `references/eval-design.md` defines case reuse, fixtures, assertions, judges, optimization
  measurements, and safety.
- `references/promptfoo.md` defines generated suite and runner behavior.
