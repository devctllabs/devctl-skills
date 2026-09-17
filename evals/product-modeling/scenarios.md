# product-modeling scenarios

## Accepted, ordinary and deferred decisions

### Request

We are planning cancellation of paid bookings. I am the product decision owner. I accept a
24-hour cutoff for full refunds: allowing cancellation until departure would leave the operator
unable to refill seats, while making all bookings non-refundable would discourage purchases.
We have not implemented this yet. Use the term "booking" consistently; this is just a wording
clarification. Whether medical exceptions receive refunds needs a response from finance; do
not decide that for them. Capture the decisions and outstanding question. You may create the
local tracker artifact `tracker/booking-cancellation-questions.md` and relevant decision records.

### Setup

Copy [fixtures/booking-cancellation](fixtures/booking-cancellation) into a disposable workspace.
The tracker configuration explicitly uses local Markdown for this test. Provide the current
`skills/product-modeling/SKILL.md` and its resources. No real tracker integration is exercised.

### Success criteria

- Exactly one new accepted PDR captures the cutoff, its reason and meaningful trade-off, using
  the current skill's record convention. Ordinary wording clarification does not produce a PDR.
- A single local question artifact preserves the medical-exception decision as open and names
  finance as the missing authority; no invented answer or accepted PDR settles it.
- Existing current product docs remain byte-for-byte unchanged: this is proposed behavior.
- Inspect actual documents and references; a claim to have recorded decisions is insufficient.

## Resolve an existing deferred question

### Request

Finance has answered PQ-001: medical exceptions receive the same refund treatment as other
bookings. They rejected collecting medical evidence because we should not hold sensitive health
documents; accepting unsupported claims would undermine the cutoff. I accept that decision.
Update `tracker/booking-cancellation-questions.md` and record the decision. This is still planning.

### Setup

Start from [fixtures/booking-cancellation](fixtures/booking-cancellation). The supervisor adds
`tracker/booking-cancellation-questions.md` with title `Product Questions: Booking cancellation`,
`Status: Open`, and PQ-001 asking whether medical exceptions receive refunds, with `Status: Open`
and `Blocking: Medical-exception refund policy`. This is a standalone setup, not a dependency
on the first scenario's generated output. Provide the target skill and its resources.

### Success criteria

- The same artifact retains PQ-001, faithfully records the answer and marks it Answered; the
  artifact becomes Resolved under the local tracker's closure convention.
- A qualifying accepted PDR explains the trade-off and is linked from the question. No duplicate
  question artifact is created. Current product docs remain unchanged.
