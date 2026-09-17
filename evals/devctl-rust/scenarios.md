# devctl-rust scenarios

## Reusable core and CLI delivery

### Request

Build a small `notes add NAME --root DIR` CLI. Store one UTF-8 file `<NAME>.txt` containing NAME
and a newline. Reject empty names, path separators, `.` and `..`; an existing note is a conflict
and must retain its bytes. Keep the operation reusable by a future server, but implement only
this CLI and its owner tests. Use synchronous filesystem I/O; no async runtime is needed.

### Setup

Use an empty disposable workspace with Rust/Cargo available. Provide
`skills/devctl-rust/SKILL.md`, outside-in-tdd, simplify-code and required resources. The executor
creates the project; no server or external storage is required.

### Success criteria

- Independently run successful creation, conflict and invalid names in a temporary root; verify
  bytes and failure status. Core tests exercise the operation without invoking the CLI.
- Core behavior has no dependency on delivery; a consumer-owned trait isolates storage. Runtime
  configuration belongs to delivery, and storage mechanics stay in its adapter owner.
- Cargo metadata shows a reusable core and thin delivery without a crate per architectural layer.
  Cargo test/check and applicable formatting/lint checks pass or have explicit environment gaps.

## Library scale stays small

### Request

Create a reusable Rust library exporting `normalize_label(&str) -> Result<String, EmptyLabel>`.
Trim surrounding whitespace and collapse internal whitespace to one ASCII space; preserve case.
Whitespace-only input is an error. Include tests; there is no application or I/O requirement.

### Setup

Use a new empty disposable workspace with Rust/Cargo. Provide the same skills/resources.

### Success criteria

- The public API handles empty, whitespace, Unicode text and already normalized input; test it
  independently and run `cargo test`.
- One library crate and a small public API suffice. No runtime, trait-backed service, delivery
  crate, database abstraction or speculative dependency is added.
