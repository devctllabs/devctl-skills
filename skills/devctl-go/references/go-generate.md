# Go Generate

## Principle

For every new or changed `//go:generate` directive, run external Go generators as module tools with
`go tool`. Reserve `go run` for handwritten Go packages or files owned by the current project.

Apply this rule even when untouched directives in the repository still run external packages with
`go run`. Do not migrate unrelated directives unless the user requests repository-wide
standardization.

## Discovery

Before changing generation, inspect the owning module and existing directives:

```bash
rg -n "go:generate" --glob '*.go'
rg -n "^tool( | \\()|mockgen|oapi-codegen" go.mod go.work
```

Also inspect repository generation commands, generator configs, generated boundaries, and CI drift
checks. Preserve their ownership and scope; this reference changes only `go:generate` directives.

## External Go Tools

Declare each external generator in the `go.mod` of the module that owns the directive and generated
output. Do not rely on another workspace module's tool declaration. Preserve an existing selected
version; for a new tool, add an explicit compatible version and review the resulting `go.mod` and
`go.sum` diff:

```bash
go get -tool go.uber.org/mock/mockgen@v0.6.0
go get -tool github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@v2.8.0
```

Never hand-edit `go.sum`. After changing tool declarations, run the repository's module-hygiene
command, normally `go mod tidy`, and review the generated metadata diff.

Invoke the declared tool by its short name when unambiguous:

```go
//go:generate go tool mockgen -destination mocks/service.go -package mocks -typed . Repository
//go:generate go tool oapi-codegen -config tools/oapi/server.yaml api/openapi/swagger.yaml
```

Use the full package path with `go tool` only when the short name collides with another declared or
Go-distributed tool. Do not use `go run <external-package>` in a new or changed directive.

## Project-Owned Go Scripts

Use `go run` only when the target is handwritten source owned by the current project and addressed
by a relative package or file path:

```go
//go:generate go run ./tools/generate.go
//go:generate go run ./internal/generate/catalog
```

Resolve relative paths from the package containing the directive. Vendored, copied third-party,
and generated sources do not count as project-owned scripts.

Keep native invocations for generators that are not Go commands. Do not rewrite `.mise.toml`, Make,
Taskfile, CI, or Devctl generation commands solely to match this directive policy.

## Verification

Run the narrowest applicable `go generate` command, inspect generated and module-metadata diffs,
then run the generated-code drift check and owner tests documented by the repository. Confirm that
every new or changed external Go generator is declared by its owning module and invoked with
`go tool`.

Test generated Go at the strongest economical level:

1. parse every generated Go file with `go/parser`;
2. use `go/ast` assertions for declarations, calls, imports, and struct tags whose semantics matter;
3. use golden files for stable full rendered output and exact byte equality for controlled generator
   processes;
4. compile or test the generated package when cross-file typing, imports, or tool integration matter.

Avoid `strings.Contains` as the sole proof of Go syntax or semantics. It remains appropriate only
for genuinely textual, non-Go output or an error/output fragment whose surrounding bytes are not
part of the contract.
