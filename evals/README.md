# Skill scenarios

Reusable behavior cases live in `<skill-name>/scenarios.md`. Execution and reporting are owned by
[skill-creator-evals](../skills/skill-creator-evals/SKILL.md); use its
[template](../skills/skill-creator-evals/assets/scenarios-template.md) when adding cases.
Select by changed behavior and consequence, not by file count or a quota per skill section.

The scenario document belongs to the supervising agent. Give an executor its Request, prepared
raw inputs, the current target SKILL.md path and required skill resources. Do not give it Success
criteria or the scenario document. Relative fixture links resolve from that scenario document;
`skills/...` paths refer to this repository root. Each case starts in an independent disposable
workspace; copy source inputs without caches, installed dependencies or previous run outputs.
Inline setup is materialized by the supervisor before dispatch, unless the request
explicitly asks the executor to create the project. Dialogue follow-ups continue the same execution.

Keep raw outputs, intermediate copies and diffs outside the fixture and target skill. For cases
where ordering is essential, retain tool-action evidence as well as final outputs; final tests
or an executor's retrospective claim cannot prove the earlier sequence. Inspect independent
behavior examples in addition to executor-authored tests. Unavailable tools or host integrations
remain explicit gaps, never simulated passes.

## Selection map

| Skill | Cases | Distinct behavior protected |
| --- | ---: | --- |
| [pragmatic-work](pragmatic-work/scenarios.md) | 1 | Complete, focused non-code work |
| [simplify-code](simplify-code/scenarios.md) | 1 | Public characterization before private refactoring |
| [outside-in-tdd](outside-in-tdd/scenarios.md) | 2 | Growing behavior versus migrating a public contract |
| [devctl-go](devctl-go/scenarios.md) | 7 | Architecture scale plus runtime CLI/filesystem, HTTP auth/health, and Kafka delivery boundaries |
| [devctl-python](devctl-python/scenarios.md) | 3 | Application operation, library scale, typed I/O migration |
| [devctl-rust](devctl-rust/scenarios.md) | 2 | Reusable application core versus a plain library |
| [devctl-openapi](devctl-openapi/scenarios.md) | 4 | Strict extensions, scale-adaptive topology, and consumer constraints |
| [devctl-react-vite](devctl-react-vite/scenarios.md) | 2 | Visible async states versus generated API isolation |
| [devctl-obsidian-react](devctl-obsidian-react/scenarios.md) | 2 | Resource teardown versus persisted-data migration |
| [devctl](devctl/scenarios.md) | 4 | Surgical edits, real workflows, Go-only scope, and ClickHouse migrations |
| [devctl-code-review](devctl-code-review/scenarios.md) | 2 | Detect an introduced defect and avoid a false positive |
| [conventional-commit](conventional-commit/scenarios.md) | 2 | Complete output versus narrow artifact selection |
| [product-modeling](product-modeling/scenarios.md) | 2 | Decision qualification and deferred-answer lifecycle |
| [grill-with-product-docs](grill-with-product-docs/scenarios.md) | 2 | Setup precondition and explicit composition/handoff |
| [to-system-design](to-system-design/scenarios.md) | 3 | Approval lifecycle, unresolved decisions and uncaptured trade-offs |
| [sync-docs](sync-docs/scenarios.md) | 2 | Full baseline and delta conflict resolution |
| [skill-creator-evals](skill-creator-evals/scenarios.md) | 2 | Bounded verification and an unchanged failure oracle |

These are contract-derived risks, not a history of observed incidents. The migration pilot selects
the first cases of simplify-code, outside-in-tdd and product-modeling. Other cases are unrun at
migration; preparation and link checks are not behavior evidence. Ordinary run results stay in the
execution conversation/evidence workspace rather than becoming a stale pass-status catalog.

## Migration choices

The former six Promptfoo suites are replaced by these cases. Per-layer Go checks were consolidated
into an operation and a lifecycle design; Python's tooling preservation is part of the application
case, and overlapping I/O checks are consolidated into typed migration. Generic review-style
coverage belongs to devctl-code-review rather than another Python review exercise.

Shipping and TDD fixtures remain useful, but fixed branch/nesting thresholds and regex-mandated
implementation forms are removed. The non-code brief uses one set of observable criteria instead
of four judges. Historical skill-creator-evals approval/optimization tests describe a superseded
contract and are replaced, not translated. Registration/implicit selection, repeated baselines,
stability runs and framework-specific runner tests are not retained.

Small language fixtures are reused where they make behavior reproducible. Documentation workflows
share [a tiny implemented project](fixtures/documentation-project); their tracker is explicitly local.
New-project cases use inline inputs rather than carrying generated scaffolds or vendored toolchains.
Real Devctl generation and Obsidian host checks require their actual tools and remain unrun when absent.
