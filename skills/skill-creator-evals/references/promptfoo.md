# Promptfoo Contract

## Contents

- Prerequisite
- Initialize
- Generated Layout
- Provider Policy
- Assertions
- Run Contract
- Focused Repair
- Evidence and Cleanup

## Prerequisite

Require `promptfoo` in `PATH`. If unavailable, stop with an installation prerequisite. Do not
install it, add a project package manifest, or enforce a version.

## Initialize

From the repository root:

```text
node <skill-creator-evals>/scripts/init-eval.mjs \
  --name <skill-name> \
  --target skills/<skill-name> \
  --output evals/<skill-name>
```

The initializer creates only a missing directory. It never merges or overwrites an existing suite.

## Generated Layout

```text
evals/<skill-name>/
  promptfooconfig.yaml
  cases/
  fixtures/
  rubrics/
  harness/
```

Keep candidate-independent code under `harness/` and case repositories under `fixtures/`. Give
every test a unique stable `description`.

## Provider Policy

Configure the candidate with `openai:codex-sdk`:

```yaml
sandbox_mode: workspace-write
approval_policy: never
network_access_enabled: false
web_search_mode: disabled
inherit_process_env: false
cli_env:
  PATH: "{{workspaceDir}}/.skill-creator-evals-bin:{{ env.PATH }}"
enable_streaming: true
persist_threads: false
```

The workspace hook pins names listed in `vars.toolExecutables` into the disposable
`.skill-creator-evals-bin`. This is a reliability mechanism, not a command allowlist. Use a fresh
thread per row and a default `maxConcurrency` of three. Configure every agent judge with the same
workspace, read-only sandboxing, no network, and no approvals.

## Assertions

The template supplies:

- `harness/assert-command.mjs` for argv-based commands;
- `harness/assert-workspace.mjs` for paths, content, and protected files;
- `harness/assert-trajectory.mjs` for ordered trace patterns.

Add case-specific modules only when these primitives cannot express the contract. Enable tracing so
skill-use and trajectory assertions have provider evidence.

For public structured output, configure the candidate provider's native `output_schema` and add a
deterministic JSON assertion. Native generation constraints do not replace validation of the
observed output string.

## Run Contract

From any directory, use the only supported runner command:

```text
node evals/<skill-name>/harness/run.mjs all
node evals/<skill-name>/harness/run.mjs all --max-concurrency <N>
```

The runner:

- rejects `dev`, `final`, and other commands;
- invokes Promptfoo once for a standard generated suite;
- disables cache, sharing, and table output;
- passes `--repeat 1`;
- evaluates every case exactly once;
- prints `START <description>` after preparing each disposable workspace and
  `DONE <description>` after collecting its evidence;
- defaults to concurrency three and accepts a positive-integer override;
- returns failure when any row fails or has an infrastructure error.

Custom runners may preserve explicit sequential cost stages and fail-fast between stages. Each
candidate case must still execute once; a later read-only judge stage may grade retained candidate
evidence without rerunning the candidate.

Promptfoo may exit `100` for an assertion failure. Parse readable row evidence before classifying
that as a semantic failure. Treat any other nonzero status, or termination before readable row
evidence exists, as a runtime failure.

## Focused Repair

After a failed `all`, rerun only failed descriptions from the eval directory:

```text
promptfoo eval -c promptfooconfig.yaml \
  --filter-pattern '<regex matching failed descriptions>' \
  --no-cache --no-share --no-table --repeat 1
```

When focused cases pass, run one final `all`.

## Evidence and Cleanup

The generated runner writes:

- `results-all.jsonl`;
- `report-all.json`;
- a temporary `promptfoo-runtime-all` directory retained on runtime failure.

The workspace hook adds bounded Git status, diff, untracked files, retained workspace path, and
cleanup errors to `metadata.skillCreatorEvals`.

Evidence lives under an operating-system temporary directory whose path the runner prints. Set
`SKILL_CREATOR_EVALS_KEEP_WORKSPACES=1` only for local diagnosis. On failure, inspect the row export
and report for the complete grading tree.
