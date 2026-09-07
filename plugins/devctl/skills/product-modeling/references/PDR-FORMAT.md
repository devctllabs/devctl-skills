# Product Decision Record format

PDRs live in `docs/product/decisions/` and use numbering independent from ADRs:
`0001-<slug>.md`, `0002-<slug>.md`, and so on. Scan the directory for the highest existing number
and increment it. Create the directory only for the first qualifying decision.

## Required form

```md
# {Short title of the product decision}

Status: Accepted
Date: YYYY-MM-DD

{One to three sentences covering the context, accepted decision, and reason.}
```

The date is the acceptance date. Open proposals and unanswered questions are not PDRs.

Add a section only when it preserves useful information that the required paragraph cannot carry:

- `## Considered Options` for rejected alternatives worth remembering.
- `## Consequences` for non-obvious effects on users, operations, data, or dependent workflows.
- `Supersedes: PDR-NNNN` when the decision replaces an earlier PDR. Mark the earlier record
  `Status: Superseded by PDR-NNNN`.

Use `Status: Deprecated` only when the recorded behavior no longer exists and no replacement
decision supersedes it. Keep historical records in place.
