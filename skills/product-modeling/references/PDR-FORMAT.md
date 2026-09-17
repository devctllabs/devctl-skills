# Product Decision Record format

Use the PDR directory defined in [PRODUCT-DOCS.md](PRODUCT-DOCS.md). Create the directory only
for the first qualifying decision.

## Numbering

Number PDRs sequentially and independently from ADRs, starting at `0001` and padding numbers
with leading zeros to four digits: `0001-<slug>.md`, `0002-<slug>.md`, and so on. Scan the PDR
directory for the highest existing number and increment it by one.

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
