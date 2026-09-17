# sync-docs scenarios

## Full baseline of a small implemented project

### Request

Establish the first durable documentation baseline for this implemented project. Discover what
exists, resolve material ambiguities with me, and present the complete proposed changes.

### Setup

Copy [documentation-project](../fixtures/documentation-project) into a disposable workspace.
Provide `skills/sync-docs/SKILL.md`, domain-modeling, product-modeling, grilling and their resources.
Owner facts: this repository only computes eligibility; it does not perform refunds. The business
reason for choosing 24 hours is unavailable and must be explicitly deferred if needed. There
are no other subsystems or integrations. After the proposal, the supervisor explicitly approves
exactly its listed local files. Continue that same execution through publication.

### Success criteria

- Discovery accounts for the function, tests, configuration and absence of runtime/integrations;
  claims about implemented behavior agree with the >=24 boundary.
- Capture the pre-approval workspace: durable docs are not written before the unified proposal.
  After approval, actual writes match it and cover product, architecture, terminology and indexes
  only where justified. Unknown decision rationale is not invented as an accepted PDR/ADR.
- Every in-scope behavior is documented or explicitly deferred, links resolve and code/tests remain
  unchanged. No roadmap or imagined payment system is presented as implemented truth.

## Resolve drift before delta publication

### Request

Synchronize docs for the delivered cutoff change in booking.py. Compare it with the accepted
design in `tracker/cutoff-design.md` and present the documentation changes before writing them.

### Setup

Copy the same independent fixture. Add `docs/product/bookings.md` stating the cutoff is 48 hours
and `tracker/cutoff-design.md` with `Status: Accepted`, specifying 48 hours. Code/tests still
implement 24. On the conflict question the supervisor responds: "24 is the intended delivered
rule. I approve amending the accepted design to 24; 48 was recorded incorrectly. The work is
booking.py and tests/test_booking.py in this local workspace." Approve the subsequent unified
file proposal explicitly and continue the same execution.

### Success criteria

- Before writing, the executor surfaces the 24/48 conflict and seeks the decision rather than
  silently treating code or the accepted design as authoritative.
- After resolution and file approval, current product docs say 24; the same design becomes
  Implemented with transition date and concrete relative implementation links.
- No unrelated baseline rewrite occurs. Changed terminology/index/decision documents are included
  when needed and match the proposal; code/tests stay unchanged and links resolve.
