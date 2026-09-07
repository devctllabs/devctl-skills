---
name: product-questions
description: Capture and maintain a feature's product questions and faithful answers in its configured issue tracker. Use explicitly alongside a feature interview.
---

Act as an interview companion to `$grill-with-docs`; do not replace or restart its design tree.
Read `docs/agents/issue-tracker.md` and, when present, the configured triage-label mapping. If the
tracker configuration is missing, ask the user to run `$setup-matt-pocock-skills` before
publishing.

Create one tracker artifact for the feature, lazily, when the user says a product question needs
thought or external approval. Infer the feature identity from the conversation; ask only when it
is ambiguous. Reuse an artifact reference supplied by the user or already linked from the current
conversation instead of creating a duplicate.

Maintain questions in this form:

```md
# Product Questions: <Feature>

Status: Open | Resolved

## PQ-001 — <Question?>

Status: Open | Answered
Blocking: <affected design branch> | No

### Context

<Why the answer matters and what is already known.>

### Team Proposal

<Optional recommended answer and trade-off.>

### Product Response

<The relevant response, kept faithful to the source.>

Decision record: <optional PDR link>
```

Number questions sequentially within the artifact. Omit optional sections and fields until they
have content. Do not remove answered questions.

When the user supplies product feedback in any form, map each unambiguous answer to its question.
Ask before mapping an ambiguous response. Mark a question `Answered` only when the response
settles it, preserve the response faithfully beside the question, and add a PDR link only when
`$product-modeling` records a qualifying accepted decision.

Keep the tracker artifact open while questions remain. When a triage-label mapping exists, apply
its `ready-for-human` label. Once all questions are answered, set the artifact status to
`Resolved` and close the tracker item. Blocking questions stop only their dependent design-tree
branches; let the interview continue across the rest of the frontier.
