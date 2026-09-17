---
name: sync-docs
description: Synchronize durable product, architecture, domain, and decision documentation with an implemented system, either project-wide or for one delivered change.
---

Use `$domain-modeling` and `$product-modeling`. Read
[references/CURRENT-DOCS.md](references/CURRENT-DOCS.md), `docs/agents/domain.md`, the configured
domain documents, and the repository's existing documentation before proposing changes. If the
setup configuration is missing, stop before publication and tell the user to run
`$setup-matt-pocock-skills`, then resume this workflow.

Infer the synchronization scope from the request and available evidence:

- **Full**: the user asks for an initial baseline, or an existing implemented system has no
  reliable documentation baseline.
- **Delta**: the user identifies an implemented feature, change, branch, commit, or review whose
  documentation must be reconciled.

Ask which scope applies only when both remain plausible.

For a full sync, discover the existing repository completely: account for every subsystem,
boundary, integration, and critical flow through its documentation, code, tests, configuration,
and relevant history without mechanically reading every line. Interview the owner with
`$grilling` until every material ambiguity is resolved or explicitly deferred.

For a delta sync, start from explicit artifacts supplied by the user, then links in the current PR
or ticket, then the current branch, working tree, and conversation. Read the implemented change,
tests, configuration, accepted System Design, and spec when they exist. Account for every changed
product rule, term, component, interface, flow, deployment concern, failure mode, and operational
constraint. Use `$grilling` when evidence conflicts with accepted decisions; resolve the drift
before treating either side as current truth.

During discovery and discussion, collect glossary, PDR, ADR, product-document, architecture, and
index changes without writing them. Present one approval proposal naming every file to create or
update, every qualifying PDR or ADR, every System Design transition, and every explicit deferral.

After approval, write the smallest complete change set. Use `$product-modeling` for product
documents and PDRs, `$domain-modeling` for configured glossaries and ADRs, and this skill's current
documentation model for indexes and architecture. When a System Design exists, set it to
`Status: Implemented`, set the transition date, and link the concrete implementation through the
configured tracker convention.

Finish only when every in-scope implemented behavior is covered by current documentation or an
explicit deferral, the durable docs match the implementation and accepted decisions, all links
resolve, and the written result matches the approved proposal.
