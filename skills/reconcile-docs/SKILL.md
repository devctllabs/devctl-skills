---
name: reconcile-docs
description: Reconcile implemented feature changes with current product, architecture, domain, and decision documentation after implementation or code review.
---

Use `$product-modeling`, `$domain-modeling`, `$karpathy-guidelines`, and `$pragmatic-work`.

Start from the implemented change. Prefer explicit references supplied by the user, then links in
the current PR or ticket, then the current branch, working tree, and conversation. Resolve the
Accepted System Design and implementation spec when they exist. If more than one artifact remains
plausible, ask rather than guessing. A feature may omit a design or spec only when that artifact
was genuinely not part of its workflow.

Read the actual change, its tests and configuration, the referenced artifacts, `CONTEXT.md`, and
the existing `docs/` entrypoint and current product and architecture documents. Account for every
implemented change to product behavior, business rules, terminology, components, boundaries,
interfaces, data and critical flows, deployment, failure behavior, and operational constraints.

Compare implementation with the Accepted System Design and spec before writing. When they differ
materially, present the exact drift and return the affected decision to `$grill-with-docs` and
`$product-modeling`. Do not promote either the implementation or the design as current truth until
the user confirms the resolution and any qualifying ADR or PDR is recorded.

Once implementation and accepted decisions agree, update every affected current product,
architecture, index, and glossary document. Preserve the existing documentation layout and create
a missing current-state document only when the implemented behavior has no suitable owner. Keep
current documents free of planned behavior and discussion history; link qualifying PDRs and ADRs
instead of copying their rationale.

When a System Design exists, update it to `Status: Implemented`, set the transition date, and link
the concrete PR, commit, or working-tree change using the configured tracker convention. Do not
manage roadmap or user-guide documentation.

Finish only when the current docs match the implementation, all affected durable truth is
accounted for, links resolve, and no unconfirmed drift remains.
