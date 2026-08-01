# Workflow

## Contents

- Inspect
- Prepare the Contract
- Approval Gate
- Optimization Measurements
- Change the Skill
- Diagnose Failures
- Decision Gate
- Finish

## Inspect

Resolve repository facts before interviewing:

- target skill path, name, frontmatter, instructions, references, scripts, and assets;
- neighboring skill descriptions that may compete for activation;
- existing cases, fixtures, assertions, rubrics, harness behavior, and project commands;
- Git state and user-owned changes;
- caller-visible behavior, high-risk failure modes, and external side effects;
- availability of Promptfoo, Codex, and target-project validation tools.

Do not edit, stage, revert, or overwrite unrelated changes. Treat a skill as existing whenever its
`SKILL.md` exists, even if it is untracked.

Ask only about decisions that cannot be discovered: activation examples, caller-visible artifacts,
failure behavior, side effects, semantic quality, optimization targets, public response schemas,
and cost or concurrency constraints.

## Prepare the Contract

Inspect existing cases before creating new ones. For every requested behavior:

1. Reuse the existing case when its request exercises the same caller-visible behavior.
2. Update that case's request, minimal fixture, deterministic assertions, semantic rubric, and
   trajectory checks as one coherent contract.
3. Add a case only when the behavior is distinct. Do not copy a successful target case merely to
   label the copy as regression coverage; the successful target case already protects the behavior.
4. Initialize `evals/<skill-name>/` with `scripts/init-eval.mjs` only when the suite is missing.
   Never overwrite an existing suite with the initializer.
5. Use deterministic syntax, path, schema, and measurement checks while preparing the contract.
   Do not execute the target skill as a model candidate.
6. Execute every new assertion or measurement script against representative passing and failing
   inputs. A syntax check alone does not validate its interface or threshold behavior.

Before changing the skill, present a concise case table:

```text
case | request | fixture | hard gates | judge rubrics | trajectory | side effects | post-change outcome
```

When the response is a public machine-readable artifact, include the complete schema and its
deterministic validation gate. For an optimization, also include the measured artifact, baseline,
target, algorithm, repetition policy, and non-compensable behavior gates.

State the post-change recovery sequence in the approval contract: classify failures, rerun only
failed case descriptions while repairing them, then perform one final `all`.

## Approval Gate

Require explicit approval of requests, fixtures, assertions, rubrics, side effects, optimization
measurements, and pass rules. Approval freezes their meaning.

Before approval and before the target skill changes:

- permit read-only repository and skill inspection;
- permit deterministic validation of eval artifacts and fixtures;
- permit necessary approved optimization-baseline measurements that do not execute the candidate;
- do not run Promptfoo against the current skill;
- do not create a separate candidate copy;
- do not invoke `$skill-creator` or edit the target skill.

Mechanical repairs may proceed without renewed approval only when they preserve the approved
meaning, such as fixing a path, syntax error, broken fixture setup, or invalid assertion module.
Explain the repair. Any semantic change to a request, fixture assumption, assertion, rubric, or pass
rule requires renewed approval before another candidate run.

## Optimization Measurements

Treat the optimization metric as an independent hard gate beside existing behavior cases. Record:

- exact artifact and unit;
- reproducible baseline value;
- user-provided target or minimum improvement;
- command or algorithm used before and after;
- deterministic or stochastic classification;
- repetitions, aggregation, and acceptable variance only when needed.

Measure a deterministic baseline once. Do not invent repeated measurements for a stable static
metric. Do not add an artificial behavioral failure when existing cases already protect behavior.
An improved metric never compensates for a failed behavior case.

If the pre-change deterministic metric already satisfies the target, stop and report that no skill
change is justified. If the requested baseline requires executing the candidate model, defer it
until after the skill change or obtain a different non-candidate measurement contract.

## Change the Skill

After approval, invoke `$skill-creator` and create or edit the smallest useful skill. Keep the eval
contract fixed. Prefer concise instructions and reusable deterministic resources only for fragile
or repeated operations.

Then run:

```text
node evals/<skill-name>/harness/run.mjs all [--max-concurrency <N>]
```

The default concurrency is three. Use an approved override when requested. The `all` command runs
each case once with Promptfoo `--repeat 1`.

## Diagnose Failures

Classify failures before editing:

- **candidate**: the changed skill does not satisfy the approved contract; repair the skill;
- **fixture or grader**: the eval implementation is mechanically wrong; repair it without changing
  the approved meaning;
- **judge variance**: the semantic gate is unstable; calibrate or tighten the rubric without
  lowering the intended bar;
- **runtime**: Promptfoo, the provider, authentication, result export, or a prerequisite failed;
  repair the environment without changing skill or eval semantics.

Promptfoo can exit before producing row evidence. Classify a missing or unreadable row export as a
runtime failure, preserve its runtime directory, and repair it separately from semantic candidate
work.

After a failed `all`, rerun only the failed descriptions directly with Promptfoo:

```text
promptfoo eval -c promptfooconfig.yaml \
  --filter-pattern '<regex matching failed descriptions>' \
  --no-cache --no-share --no-table --repeat 1
```

When the focused cases pass, run one final `all`. Do not repeatedly spend model calls on cases
already known to pass.

## Decision Gate

Stop skill edits and eval runs when a semantic failure exposes a material conflict that repository
evidence, explicit instructions, and the approved contract cannot resolve.

Keep the worktree and evidence intact. Present:

- conflicting sources and affected cases;
- the option to repair the skill while keeping the contract fixed;
- any viable semantic contract revision, explicitly requiring renewed approval;
- removal of an unsupported guarantee, explicitly requiring renewed approval;
- tradeoffs and a recommendation.

Do not silently weaken the eval or select product behavior for the user.

## Finish

Finish only when:

- the target skill passes `quick_validate.py`;
- deterministic assertions and semantic judges pass;
- one complete final `all` succeeds with no infrastructure error;
- repository-specific checks pass;
- the report identifies any remaining variance or skipped prerequisite.
