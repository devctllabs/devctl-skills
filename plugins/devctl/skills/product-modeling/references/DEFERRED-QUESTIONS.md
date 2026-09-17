# Deferred product questions

Use this branch only when a product decision cannot be settled by the current decision authority
and needs later thought or an external response. `grilling` owns the interview strategy and its
ordinary questions; this artifact persists only decisions that have left the currently answerable
frontier.

Read `docs/agents/issue-tracker.md` and, when present, the configured triage-label mapping. If the
tracker configuration is missing, stop before publication and tell the user to run
`$setup-matt-pocock-skills`, then resume the current workflow.

Create one tracker artifact per interview subject, lazily, when its first decision is deferred.
Infer the subject from the conversation and ask only when ambiguous. Reuse a supplied or already
linked artifact rather than creating a duplicate. Before the first tracker mutation in the
conversation, show the intended create or update and obtain explicit approval; a request that
explicitly asks to mutate the named artifact already supplies that approval.

Maintain the artifact in this form:

```md
# Product Questions: <Subject>

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

Number questions sequentially. Omit optional sections and fields until they have content, and
retain answered questions.

When feedback arrives, map each unambiguous answer to its question and ask before mapping an
ambiguous response. Preserve the response faithfully. Mark the question `Answered` only when the
response settles the product decision, then run the normal product-decision and PDR qualification
rules. Add a PDR link only when a PDR is actually written.

Keep the tracker artifact open while questions remain. Apply the configured `ready-for-human`
label when available. Once every question is answered, set the artifact status to `Resolved` and
close the tracker item. A blocking question pauses only its dependent design-tree branch; the rest
of the grilling frontier remains active.
