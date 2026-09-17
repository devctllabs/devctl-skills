# to-system-design scenarios

## Publish and accept the same design

### Request

Publish `tracker/refund-design.md` for this agreed design. Extend the existing pure refund rule
with a CLI `refund-check HOURS` that prints eligible/ineligible and returns 0 for valid input,
2 for invalid input. The CLI delegates to the existing function; the 24-hour rule is unchanged.
Non-negative whole hours are valid. No payment integration, storage or deployment is involved.
I authorize creating that local tracker artifact; the design has not yet been approved.

### Setup

Copy [documentation-project](../fixtures/documentation-project) into a disposable workspace.
Provide `skills/to-system-design/SKILL.md` and its format reference. After inspecting the first
response, the supervisor sends: "I explicitly approve this design. Update the same artifact to
Accepted." This is a second message in the same execution, not a fresh test run.

### Success criteria

- First publication is Proposed, accounts for CLI/core boundary and invalid-input behavior, and
  introduces no unagreed choices or duplicate implementation tickets. Record the first artifact.
- Only after approval does the same artifact become Accepted and close by the local convention;
  it is not Implemented. The final response returns its explicit reference for to-spec.
- Links resolve; diagrams, if useful, agree with the design. Existing implementation, current
  docs, glossary, ADRs and PDRs stay unchanged.

## Blocking decision returns to interview

### Request

Publish a design for paying approved refunds. We have not chosen the payment provider, refund
idempotency policy or failure recovery; these choices need a product/engineering interview.

### Setup

Copy the same independent fixture. Provide the same skill and format reference. No owner answers
settling the explicitly open questions are supplied during this execution.

### Success criteria

- The response identifies the blocking design branch and returns it to grill-with-product-docs.
- It does not choose a provider/policy or publish a purportedly agreed/Accepted design. Existing
  implementation and current docs remain unchanged.

## Uncaptured trade-off returns upstream

### Request

Publish `tracker/offline-design.md` for this agreed design. The CLI will use embedded SQLite rather
than remote Postgres so that it works fully offline. We accepted the portability and operational
simplicity over centralized access, but no ADR or PDR has evaluated or recorded this trade-off. I
authorize creating the local design artifact; the design has not yet been approved.

### Setup

Copy the same independent fixture. Provide the same skill and format reference. No upstream
qualification or decision-record capture is supplied during this execution.

### Success criteria

- The response returns the uncaptured material trade-off to grill-with-product-docs for
  qualification and capture before publication.
- It does not decide whether the trade-off requires an ADR or PDR, publish the System Design, or
  modify current docs, the glossary, ADRs or PDRs.
