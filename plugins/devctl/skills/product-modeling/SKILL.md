---
name: product-modeling
description: Sharpen product behavior, manage deferred product decisions, and maintain product documentation policy while discussing a project, feature, baseline, or implemented change.
---

Build the product model as decisions are discussed. Separate current behavior, proposed behavior,
open product questions, and accepted decisions.

Read [references/PRODUCT-DOCS.md](references/PRODUCT-DOCS.md) before placing or changing product
documentation.

Challenge vague rules with concrete user scenarios, boundary cases, and conflicting constraints.
Check claims against existing product docs, tests, code, configuration, and domain language. When
the evidence disagrees with the conversation, surface the conflict and let the decision authority
resolve it.

Treat the current speaker as the decision authority for a decision unless they say it needs more
thought or external product approval. In that case, leave the decision open and read
[references/DEFERRED-QUESTIONS.md](references/DEFERRED-QUESTIONS.md). This branch persists product
decisions that the current authority cannot settle; it does not collect the ordinary questions
asked by the interview.

During project or feature planning, keep proposed behavior in planning artifacts. `$sync-docs`
owns changes to current product documents after implementation and during a full existing-system
baseline. When `$sync-docs` is active, collect product-document and decision-record changes for
its approval gate instead of writing inline.

Create a PDR only after a product decision is accepted and all three conditions hold:

1. Changing it after users, data, or dependent workflows rely on it would be meaningful.
2. The behavior would be surprising without its reason.
3. Credible alternatives existed and a real trade-off selected one.

Ordinary clarifications belong in the relevant feature artifact and, after implementation, the
current product document. For a qualifying decision, read both
[references/PRODUCT-DOCS.md](references/PRODUCT-DOCS.md) and
[references/PDR-FORMAT.md](references/PDR-FORMAT.md), then write the PDR when the surrounding
workflow permits documentation changes. When a deferred answer settles a qualifying decision,
link the resulting PDR from its question.
