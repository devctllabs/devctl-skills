---
name: to-system-design
description: Synthesize an agreed feature discussion into a reviewable System Design artifact with useful Mermaid diagrams, then maintain it through approval and implementation states.
---

This is a synthesis and publication skill, not an interview. Read
[references/SYSTEM-DESIGN-FORMAT.md](references/SYSTEM-DESIGN-FORMAT.md), the repository's current
product and architecture docs, the domain documents configured by `docs/agents/domain.md`,
relevant ADRs and PDRs, code and tests, and the subject's deferred product-question artifact when
one exists.

Read `docs/agents/issue-tracker.md` and, when present, the configured triage-label mapping. If the
tracker configuration is missing, ask the user to run `$setup-matt-pocock-skills` before
publishing.

Before drafting, account for every material component, boundary, integration, critical flow,
constraint, failure mode, and migration introduced or changed by the feature. Treat configured
domain documents, ADRs, and PDRs as read-only inputs. Return any uncaptured material trade-off,
hidden decision, or unanswered blocking question to `$grill-with-product-docs` for qualification,
capture, or resolution before publication; resume synthesis only after that branch returns.

For a new feature, publish one `Status: Proposed` artifact through the configured tracker. When a
triage-label mapping exists, apply its `ready-for-human` label. For review feedback, require or
resolve an unambiguous reference to the existing artifact, incorporate only decisions confirmed
through the feature interview, and update the same artifact in place.

Move the artifact to `Status: Accepted` only after explicit design approval and no blocking open
questions remain. Record the accepted state using the tracker convention and close the tracker
item; closure represents completed review and does not make the artifact immutable. A later
`$sync-docs` run may update it to `Status: Implemented` and link the implementation.

Finish by returning the artifact reference. The caller passes that explicit reference to
`$to-spec`, which owns the implementation specification; do not publish tickets or duplicate the
`to-spec` template here.
