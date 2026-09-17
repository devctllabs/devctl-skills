---
name: skill-creator-evals
description: Check a newly created or substantively changed skill with a few critical scenarios. Prepare reusable Markdown cases and verify actual behavior after edits or on request.
---

# Skill Creator Evals

Find critical behavior failures with a small execution budget. Use after creating or substantively
changing a skill, or when asked to verify one. Cosmetic edits and scenario maintenance alone do
not need a behavioral run. Verify behavior from the skill's instructions; discovery, registration,
and implicit selection are outside this skill's scope. Creating the target skill remains a separate task.

## Select and record

Read the target skill, the requested change, and any saved scenarios. Select one realistic task
that exercises its main promise; add a second or third only for a distinct consequential risk.
For an existing skill, focus on affected behavior and reuse relevant cases.

Before execution, save cases in `evals/<skill-name>/scenarios.md` under the working repository
(or the user-specified location). When creating or adding cases, use the
[scenario template](assets/scenarios-template.md) as a recommended starting point. Preserve existing
formatting when the cases are clear. Save new cases only when they protect distinct behavior; select a relevant subset rather
than running the entire accumulated file. Criteria must follow from the task and skill contract,
not an assumed implementation. Preserve their meaning while evaluating the result.

## Execute and inspect

Budget 1–3 initial independent executions, once per selected case, plus at most one repair rerun
for the whole verification. Skip baseline comparisons, stability repeats, and separate model judges
by default. This bounds execution count, not elapsed time or token use; honor any tighter user budget.

Run sequentially through the host's native subagent capability, with a fresh context that excludes
the supervising conversation. Use the available tool's schema to select the appropriate options.
Use native subagents rather than launching an agent CLI from the shell. Give each executor the
realistic request, the path to the current target `SKILL.md`, and required raw inputs. Instruct it
to read and apply that file, and make the skill's required resources accessible; the skill need
not be registered in the environment. Retain grading criteria, expected answers, and earlier
conclusions in the supervising session. Executions are test tasks: they must not initiate another
automatic skill-verification cycle.

Use disposable workspaces for file operations, with only necessary inputs. Keep evidence outside
the target's production files and within the task's authorized resources. If native subagents
are unavailable, save the scenarios and report them as unrun.

Inspect actual responses, files, diffs, and relevant tool actions against the saved criteria.
Use available deterministic checks for objective properties, and assess semantic results in the
supervising session. An executor's claim of success is not evidence. Check required process steps
only when they are part of the skill's essential behavior. Retain enough raw evidence to support
the verdict, with artifact locations where useful.

## Repair and finish

For a clear skill defect within the authorized scope, make one narrow repair and rerun one affected
case once in a fresh context. With multiple failures, spend that single rerun on the most consequential
one and report the others as unresolved or unverified after the repair. Fixture or criteria defects
are evaluation problems: explain the correction, preserve the intended requirement, and count any
new execution against the same budget. Stop on an unclear cause or exhausted budget; a passing retry
does not establish stability. No final full-suite rerun is required.

Run the available skill validator after target-skill edits and check changed references; these
checks do not substitute for behavior evidence. Report each selected case as passed, failed, or
unrun, with a brief reason and evidence. Include repairs, execution count, and remaining uncertainty.
Store reusable scenarios in the repository; ordinary run results can stay in the conversation.
