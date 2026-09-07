---
name: devctl-baseline-docs
description: Initialize accepted product and technical documentation for an existing repository through full discovery, owner interviews, current-state docs, CONTEXT.md, and confirmed decision records.
---

Use `$grill-with-docs`, `$product-modeling`, `$karpathy-guidelines`, and `$pragmatic-work`.

Read [references/DOCUMENTATION-MODEL.md](references/DOCUMENTATION-MODEL.md) before proposing the
baseline.

Discover the existing repository completely: account for every subsystem, boundary, integration,
and critical flow through its documentation, code, tests, configuration, and relevant history,
without mechanically reading every line.

Interview the owner until every key ambiguity is resolved or explicitly deferred. Establish the
current baseline plus only the decisions needed to close discovered gaps.

During discovery and the interview, make no documentation changes. Present one final change set
for approval. The proposal must name every file to create or update, every qualifying PDR or ADR,
and every ambiguity that remains deferred.

After approval, create the smallest complete current-state documentation tree, update
`CONTEXT.md`, and write only qualifying accepted PDRs and ADRs. Use Mermaid when relationships,
flows, states, or deployment topology are materially clearer as a diagram. Finish only when every
discovered subsystem, integration, and critical flow is covered by a current-state document or an
explicitly documented deferral, all links resolve, and the written baseline matches the accepted
proposal.
