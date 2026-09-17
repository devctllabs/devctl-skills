# grill-with-product-docs scenarios

## Missing setup

### Request

Help me shape a booking cancellation feature and capture the decisions.

### Setup

Use an empty disposable workspace. Provide `skills/grill-with-product-docs/SKILL.md`.

### Success criteria

- The response identifies missing setup and directs the owner to setup-matt-pocock-skills.
- No product/domain/tracker configuration or durable decision artifact is invented.

## Compose the interview and hand off

### Request

Help shape a change to the refund cutoff from 24 to 48 hours. This is only a change to the
existing pure rule, with no new integration, storage, or runtime. I own this decision and accept
48 hours because operators need more time to refill seats. Customers will see the cutoff before
purchase; it applies only to new bookings. Capture the agreed behavior and suggest the next step.

### Setup

Copy [documentation-project](../fixtures/documentation-project) into a disposable workspace.
Provide the target skill and the actual grilling, domain-modeling and product-modeling skills
with their resources. Missing composition dependencies make this case unrun, not an invitation
to invent replacement skill instructions. If clarification is requested, the supervisor answers
only from the request facts; any additional product decision remains open.

### Success criteria

- Actual actions show the three required skills being composed; this checks explicit workflow
  composition, not implicit selection or environment registration.
- Questions focus on remaining material decisions, without reopening settled facts. Any persisted
  decision follows its owning skill, and current implementation docs are not overwritten by plans.
- Once the frontier is settled, the handoff is to to-spec for this bounded rule change; no
  unnecessary System Design, implementation or ticket publication is performed.
