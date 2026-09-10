---
name: conventional-commit
description: Draft Conventional Commit messages, git branch names, and pull request titles or descriptions from repository changes, diffs, refs, or user summaries. Use when asked to propose any of these artifacts; return text only without performing Git or hosting actions.
---

# Conventional Commit

## Workflow

Determine the requested artifacts first. The complete change package contains exactly five artifacts: commit title, commit body, branch name, PR title, and PR body. Return the complete package for a bare skill invocation or a generic request that does not limit the output.

Honor narrower requests precisely:

- `commit` or `commit message`: commit title and commit body
- `PR` or `PR text`: PR title and PR body
- an individually named artifact: only that artifact

Resolve the change source before drafting. Use a pasted diff or summary directly and honor a named source. If the source is not explicit, ask one concise question before running git commands; offer staged changes, unstaged changes, the full working tree, or a named ref/range.

Use read-only commands only. Useful commands include `git status --short`, `git diff --stat`, `git diff`, `git diff --cached --stat`, `git diff --cached`, and `git show`. Do not stage files, create commits, push branches, open PRs, or mutate the repository.

For the full working tree, inspect relevant untracked text files as well as tracked diffs. For an untracked binary, use only verified facts such as its status, path, and file type. Ask for context when those facts are insufficient for an accurate draft.

Apply conventions in this order: the user's explicit instructions, explicit repository instructions/configuration/templates, then this skill's defaults. Use repository history only to identify an established output language, not as a hard formatting rule. Otherwise default to English.

Identify whether the source represents one cohesive change. For unrelated changes, briefly recommend splitting and return a separate set of the requested artifacts for each group. If the user explicitly requests one commit, comply with one combined draft and retain only the brief split warning. Prefer one best draft per group instead of alternatives.

## Commit Message

When a commit title is requested or part of the complete package, use:

```text
type(optional-scope): concise imperative summary
```

Use common types consistently:

- `feat`: user-facing feature or capability
- `fix`: bug fix or corrected behavior
- `refactor`: internal restructuring without intended behavior change
- `test`: test-only changes
- `docs`: documentation-only changes
- `chore`: maintenance that does not fit a narrower type
- `build`: build system or dependency changes
- `ci`: CI configuration or workflow changes
- `perf`: performance improvement
- `style`: formatting-only changes
- `revert`: revert of an earlier change

Choose a scope only when it adds useful locality, such as a package, module, command, API area, or UI surface. Keep the summary concise, imperative, and free of a trailing period. For an actual breaking change, use `type!:` or `type(scope)!:` and add a `BREAKING CHANGE:` footer. Use neither marker for non-breaking changes.

When a commit body is requested or part of the complete package, always write a concise body grounded in the selected source. Add concrete change details beyond the title and explain rationale only when the source supports it. Avoid repeating the title or inventing motivation.

## Branch Name

When a branch name is requested or part of the complete package, use:

```text
type/concise-kebab-slug
```

Use the same type as the associated commit title. For a branch-only request, choose a type using the commit type rules above.

Build the slug from the concise commit summary. Use lowercase ASCII, kebab-case words, no punctuation, no trailing period, and no duplicate hyphens. Keep it short but specific enough to identify the change.

Include useful locality in the slug when it improves clarity, especially for scoped changes, such as `fix/api-handle-empty-response`. Do not include a ticket ID unless the source changes or user-provided context clearly contains one.

## PR Text

When a PR title is requested or part of the complete package, make it exactly match the associated commit title by default. For a PR-title-only request, draft a Conventional Commit title using the rules above.

When a PR body is requested or part of the complete package, write it concisely in Markdown. Include:

```markdown
## Summary
- ...

## Validation
- ...
```

Use `Validation` for confirmed tests, checks, manual verification, or screenshots. When the source provides no validation evidence, write `- Not provided`. Do not invent validation results.

For non-obvious or higher-risk changes, use the expanded format instead:

```markdown
## Why

...

## What Changed
- ...

## Validation
- ...
```

Use the expanded format when the motivation is not obvious from the diff, the change includes an architectural or product tradeoff, the PR addresses a regression or incident, the PR includes a migration or compatibility concern, or reviewers need context beyond the diff.

Add `Risks`, `Breaking Changes`, or `Notes` sections only when they add concrete value. Do not add colons to headings.

## Output Format

Use the complete shape below for the complete package. For a narrower request, include only its requested blocks. For grouped changes, repeat those blocks under short group headings.

````markdown
Commit title:
`type(scope): summary`

Commit body:
```text
Concrete change details and supported rationale.
```

Branch name:
`type/concise-kebab-slug`

PR title:
`type(scope): summary`

PR body:
```markdown
## Summary
- ...

## Validation
- ...
```
````

Finish when every requested artifact is present, reflects the selected source, follows the applicable convention precedence, and contains no unsupported change details, binary descriptions, or validation claims.
