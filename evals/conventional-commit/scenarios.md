# conventional-commit scenarios

## Complete change package

### Request

Draft the change package from this summary: the CSV exporter now quotes fields containing commas
and doubles embedded quotes. Plain fields are unchanged. No validation evidence was supplied.

### Setup

No repository input is needed. Provide `skills/conventional-commit/SKILL.md`. The supplied summary
is the complete change source; the executor need not inspect the host repository.

### Success criteria

- Exactly the five requested/default artifacts appear: commit title/body, branch, PR title/body.
- The type reflects corrected behavior; the titles match, the branch is a consistent kebab-case
  name, and the body adds grounded detail. No invented ticket, breaking change or motivation appears.
- PR validation says it was not provided; no tests, Git mutations or publication are claimed/run.

## Commit-only request

### Request

Write only a commit message from this summary: README now documents the existing `--dry-run`
option. No code changed and no tests were run.

### Setup

No files are needed. Provide the same target skill.

### Success criteria

- Only commit title and body are returned, grounded in documentation-only changes.
- No branch/PR blocks, fabricated validation or repository mutations appear.
