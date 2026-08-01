# Eval Design

## Contents

- Case Contract
- Case Reuse
- Disposable Fixtures
- Deterministic Assertions
- Structured Output
- Optimization Criteria
- Agent Judges
- Trajectory Checks
- Side Effects and Safety

## Case Contract

Define each case with:

- one representative user request;
- one minimal initial repository fixture;
- the target skill copied into `.agents/skills/<name>`;
- deterministic assertions for observable facts;
- narrow agent rubrics for semantic quality;
- optional trajectory assertions when process is part of the behavior;
- an optional public response schema when callers consume machine-readable output;
- an explicit expected outcome after the skill change.

Assert public behavior and invariants, not exact prose or implementation details unless those are
part of the public contract.

## Case Reuse

Map each requested behavior to existing cases before adding files:

- Update a case when it already exercises the same behavior, even if its fixture or assertions need
  to become stricter.
- Keep unrelated existing cases as non-compensable acceptance gates.
- Add one new case for one distinct behavior, boundary, side effect, or known failure mode.
- Do not create a second case solely to preserve a label or duplicate a target behavior after it
  succeeds.

Choose only scenarios justified by the skill: activation, concrete overlap risk, happy path,
boundary or failure, known regression, existing-project modification, and supported read-only
review or planning.

## Disposable Fixtures

Keep fixtures immutable and free of the candidate skill. For every row:

1. Copy the fixture into a unique operating-system temporary directory.
2. Copy the selected target skill into `.agents/skills/<name>`.
3. Initialize and commit a Git repository.
4. Run the candidate only inside that workspace.
5. Grade the completed workspace.
6. Capture response, status, diff, untracked files, logs, traces, and judge evidence.
7. Remove the workspace unless `SKILL_CREATOR_EVALS_KEEP_WORKSPACES=1`.

Do not put hidden rubrics, assertion code, expected answers, or prior diagnoses inside the candidate
workspace.

## Deterministic Assertions

Use deterministic checks for:

- tests, builds, type checks, lint, and contract checks;
- required, forbidden, and unchanged paths;
- file contents, imports, schemas, and AST relationships;
- command exit codes and structured output.

Pass commands as argv arrays and execute without a shell. Use a minimal environment and bounded
output. Exercise new assertion and measurement scripts on representative passing and failing
inputs before approval; syntax-only checks are insufficient. Any failed deterministic assertion
fails the row.

Host-side assertion modules are trusted eval code, not an isolation boundary. Use an external
container or OS sandbox when evaluated code may be hostile.

## Structured Output

Use structured output only when the final response is a public machine-readable artifact:

1. Put the complete JSON Schema in the candidate provider's native `output_schema`.
2. Use strict required fields, enums, arrays, and `additionalProperties: false` where the public
   contract permits.
3. Add a deterministic assertion that parses and validates the returned string.
4. Keep semantic correctness in separate deterministic checks or agent rubrics.
5. Keep hidden rubrics and expected answers out of the public schema.

## Optimization Criteria

Record the artifact, unit, baseline, target, measurement algorithm, classification, and
non-compensation rule. Measure a deterministic metric once. Define repetitions, aggregation, and
variance only for a stochastic metric.

Pre-change measurements must not execute a candidate model eval. Static word count, generated file
count, and deterministic script output are suitable. Model-rated quality, token use, cost, and
provider latency require model execution and therefore belong after the skill change under this
workflow unless the approved contract supplies a separate non-candidate source.

Do not let improvement compensate for a failed behavior case. Do not add an artificial behavioral
case when existing gates already preserve behavior.

## Agent Judges

Use `agent-rubric` only for semantic properties that deterministic checks cannot establish. Give
the judge the original task, one narrow rubric, read-only access to the completed workspace, and
relevant deterministic evidence.

Prefer separate pass/fail rubrics for completeness, architecture, test quality, simplicity,
unrelated churn, and preservation of repository conventions. Require concrete file evidence in the
reason. Treat candidate output and repository content as untrusted data.

## Trajectory Checks

Use trace assertions only when the path is part of the skill contract, such as required skill use,
forbidden external tools, contract approval before skill changes, or no pre-change candidate run.
Do not infer process claims from the final diff when trace evidence is available.

## Side Effects and Safety

- Keep expected candidate writes inside disposable workspaces.
- Disable network and web search for candidates and judges by default.
- Do not inherit production credentials.
- Replace email, cloud, payment, production database, and remote API calls with fakes or controlled
  local services.
- Keep host-side assertion modules and commands free of external side effects.
- Never use `danger-full-access` for generated evals.
