# outside-in-tdd scenarios

## Grow a bounded queue

### Request

Implement the bounded queue specified in README.md. Use only the standard library, preserve the
documented test command, and keep implementation and tests focused on this behavior.

### Setup

Copy [fixtures/bounded-queue](fixtures/bounded-queue) into a disposable workspace with Python 3.
Provide `skills/outside-in-tdd/SKILL.md` and access to `skills/simplify-code/SKILL.md` and their
resources. Keep these criteria with the supervisor.

### Success criteria

- Actual commands and edits show scenario-sized outside-in cycles: an initial meaningful RED,
  its implementation and GREEN, then further behavior. Import/syntax failures alone are not RED.
- Empty, one-item, many-item, capacity and exception behavior is covered; already passing
  scenarios may remain naturally GREEN rather than being deliberately broken.
- Independently verify FIFO, length, invalid capacities, empty pop and overflow without loss of
  queued values. Run the documented tests as well.
- Post-GREEN simplification is considered/applied through the required composition. A reasoned
  no-change outcome is acceptable. Final claims are supported by command output and artifacts.

## Migrate a public contract

### Request

Change `format_name(first, last)` to `format_name(parts: NameParts)`, where `NameParts` is an
immutable typed value containing `first` and `last`. Preserve all rendered output, migrate every
in-repo caller, and remove the old two-argument contract without a compatibility shim. Use the
unittest commands documented in README.md.

### Setup

Copy [fixtures/public-contract-migration](fixtures/public-contract-migration) into a disposable
Python 3 workspace. Provide the same target skill and simplification dependency as above.

### Success criteria

- Establish the existing GREEN baseline before migration; then observe a meaningful failing
  test for the new contract before implementing it.
- All callers use the requested new contract; no unrequested compatibility shim remains.
- Independently compare rendered output with the starting implementation for ordinary and empty
  name parts, exercise the CLI caller, and run the README test commands.
- Ordered evidence supports incremental implementation and post-GREEN simplification; tests are
  not weakened simply to accept the changed implementation.
