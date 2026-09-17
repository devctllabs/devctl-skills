# Stack, generation, and quality

Use these defaults only for a needed capability in a new application. Preserve coherent existing
choices unless migration or standardization is requested, and add only modules the current behavior
uses. Names below abbreviate `github.com/devctllabs/go-libs/<module>`.

Before calling a library, inspect the selected version and workspace replacements, run
`go doc -all <import-path>`, and read the module's `example_test.go` for executable usage. Do not
copy a library API from this reference.

| Need | Default | Application decision |
| --- | --- | --- |
| Configuration | `config`; generation through Devctl | Load and validate before resolving dependent resources |
| DI/resources | `di` | Private composition root and explicit cleanup ownership |
| Runtime | `lifecycle` | Long-running task coordination and bounded one-shot shutdown |
| Retry | `retry` | Mechanism at the boundary that owns retry and idempotency policy |
| Logging | `log`, `*zap.Logger` | One constructed logger, named components, no global replacement |
| Metrics/tracing | `telemetry` | One owned runtime with explicit providers and cleanup |
| Health/debug/build | `health*`, `debugserver`, `buildinfo` | Config-gated resources and private operational exposure |
| PostgreSQL/SQLite | `postgresdb`/`sqlitedb`, `txmanager` | Endpoints in deps/adapters; atomic scope in business owner |
| Filesystem | `filesystem` | Inspect first for new rooted adapters; keep its concrete API behind a semantic repository capability |
| HTTP server | Echo, oapi-codegen, `go-libs/oapivalidator` | Strict generated edge plus handwritten library wiring and mapping |
| HTTP authentication | `oapivalidatorjwt`, `oidcsession*` | Authentication at transport; authorization in business owner |
| gRPC | `grpcserver`, `grpcclient`, `grpczap` | Generated boundaries and resources composed in deps |
| Kafka | `kafka`, `kafkaproto`, `kafkazap` | Consumer in transport, producer in client, delivery policy explicit |
| Transactional outbox | `kafkaoutbox*` | Only when state-without-publication violates correctness |
| CLI | `github.com/urfave/cli/v3` | Command ownership and lazy construction from the CLI reference |
| HTTP/Git/process | `net/http`, selected Git library, `os/exec` | Concrete client hides protocol mechanics |

## Devctl handoff

Use `$devctl` to inspect or change `devctl.yaml`, toolchain/tasks, components, sources, migration
paths, runtime activation, and generator output paths. It owns CLI discovery, validation, resolved
defaults, source synchronization, contract lint, scaffold, and generation. Use `$devctl-openapi`
for OpenAPI content and the Devctl contract-naming references for gRPC/Kafka inputs.

Run real generation through the discovered `devctl` CLI. Synchronize external sources before
dependent lint or generation. Inspect generator configuration and resulting code rather than
assuming output paths, interfaces, package names, or framework versions. Source contracts and the
manifest remain authoritative; handwritten mappings and extensions stay outside generated paths.
Missing tools produce an explicit unrun check, never imitated generated output.

Generated HTTP/gRPC/message/config packages are adapter inputs. The Go skill resumes ownership for
handwritten mapping, service calls, runtime composition, and tests after generation.

## Migrations

Keep migrations with the selected database variant and use the repository's Devctl/mise tasks.
Evolve schemas only through source-controlled, ordered migrations or the established schema tool;
repository constructors and application startup do not mutate or apply schemas, and migration
tooling stays out of runtime dependencies.

When schema and repository behavior change together, update the migration, affected queries and
mappers, and repository integration tests together. Verify that migrations apply cleanly to an
empty database and, when compatibility matters, to a representative prior schema. Assert the
intended tables, columns, indexes, and constraints; verify rollback only when the project supports
it. For rolling deployments, plan compatible expand/migrate/contract steps and keep old and new code
paths compatible for the required window. Generated migration directories remain generator-owned.

## Go generation

Inspect the owning module, all relevant `//go:generate` directives, tool declarations, configs,
generated boundaries, repository commands, and CI drift checks before changing generation.

For every new or changed external Go generator directive:

- declare the tool in the `go.mod` that owns the directive and output;
- preserve an existing selected version or add one explicit compatible version;
- invoke it with `go tool`, using the short name when unambiguous;
- review `go.mod`/`go.sum` changes and run the module-hygiene command;
- change generator inputs rather than output.

Reserve `go run ./...` for handwritten project-owned generator packages or files. Preserve native
invocations for non-Go tools. Do not migrate unrelated directives or rewrite task runners solely to
match this rule.

Run the narrowest applicable generation command and inspect both output and module metadata. Parse
generated Go, use AST assertions for declarations/imports/tags whose semantics matter, use golden
files for stable full output, and compile/test when cross-file typing or tool integration matters.
Plain substring checks alone do not establish valid Go.

## Quality gates

Use repository commands and CI configuration first. For new projects without a convention, start
with formatted changed handwritten files, `go vet ./...`, and `go test ./...`. Run focused race
tests for concurrency changes and applicable module, contract, and generation checks.

Use an established static-analysis command when present. Add `staticcheck` or a pinned aggregate
linter only for an explicit standardization need and only when it owns a distinct failure class.
Treat configured complexity and argument/result limits as prompts to find a cohesive request,
result, dependency, or owner; do not add broad suppressions to satisfy them.

Keep suppressions narrow, adjacent, named, and justified. Exclude generated, migration, and vendored
code where appropriate while continuing to check handwritten facades. Enforce dependency direction
only for packages that exist, using Go `internal`, review, existing depguard rules, or a small import
test rather than an architecture framework.

In existing projects, ratchet changed scope without repository-wide formatting, dependency upgrades,
or unrelated lint cleanup. Review every `go.mod`/`go.sum` change and avoid broad upgrades during
ordinary behavior work.
