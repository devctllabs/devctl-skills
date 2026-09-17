# simplify-code scenarios

## Public behavior survives simplification

### Request

Simplify `shipping.py` while preserving the public `shipping_quote(region, weight, express)`
signature and all behavior documented in README.md. Keep changes to the implementation and its
owner tests. Use the documented test command.

### Setup

Copy [fixtures/shipping-quote](fixtures/shipping-quote) into a disposable workspace. Python 3
and its standard library suffice. The starting tests depend on a private helper. Provide the
executor the current `skills/simplify-code/SKILL.md` and its required resources, not this file.

### Success criteria

- Public characterization passes before production changes; inspect actual test output and the
  ordered edit/command evidence. A final passing suite alone does not establish this ordering.
- Independently exercise every README rate with weights below, at, and above 1kg, an unknown
  region, and non-positive weights. Prices and exception types remain unchanged.
- The final owner tests exercise public behavior instead of constraining the private helper.
- The diff materially reduces branching, duplication, or indirection without introducing a new
  speculative abstraction. Judge the resulting code; do not require a fixed branch count.
- The documented tests pass and unrelated files remain unchanged.
