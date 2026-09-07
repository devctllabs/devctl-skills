---
name: product-modeling
description: Sharpen product behavior and record significant accepted product decisions while discussing features, requirements, business rules, scenarios, or a product documentation baseline.
---

Build the product model as decisions are discussed. Separate current behavior, proposed behavior,
open product questions, and accepted decisions.

Challenge vague rules with concrete user scenarios, boundary cases, and conflicting constraints.
Check claims against existing product docs, tests, code, configuration, and domain language. When
the evidence disagrees with the conversation, surface the conflict and let the decision authority
resolve it.

Treat the current speaker as the decision authority for a decision unless they say it needs more
thought or external product approval. In that case, leave it open for `$product-questions`; do not
turn the proposal into an accepted rule.

During feature planning, keep `docs/product/` as current truth: proposed behavior belongs in the
feature artifacts until implementation is reconciled. During `$devctl-baseline-docs`, collect
confirmed behavior and decision-record candidates without writing; its final approval gate owns
all baseline writes.

Create a PDR only after a product decision is accepted and all three conditions hold:

1. Changing it after users, data, or dependent workflows rely on it would be meaningful.
2. The behavior would be surprising without its reason.
3. Credible alternatives existed and a real trade-off selected one.

Ordinary clarifications belong in the relevant feature artifact and, after implementation, the
current product document. For a qualifying decision, read
[references/PDR-FORMAT.md](references/PDR-FORMAT.md) and write the PDR when the surrounding
workflow permits documentation changes.
