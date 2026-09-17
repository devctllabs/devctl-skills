# skill-creator-evals scenarios

These cases test the verification workflow itself. They are not in the migration pilot. When
selected later, budget explicitly for the outer executor and its requested inner test execution;
inner executors must not start automatic verification cycles.

## Verify a small skill with reusable cases

### Request

Verify the existing note-summary skill on the supplied release note. Keep the check small and
save a reusable scenario in this repository. Do not modify the target skill.

### Setup

In a disposable workspace create `skills/note-summary/SKILL.md` with valid name/description
frontmatter and body: "Summarize the supplied release note in three bullets: user-visible change,
compatibility, validation. Say Unknown when the note supplies no information for a category."
Create `note.md`: "CSV export now quotes commas. Existing plain fields are unchanged."
Provide the outer executor the current `skills/skill-creator-evals/SKILL.md` and these raw inputs.
The host must support a fresh native inner executor; otherwise only preparation can be assessed.

### Success criteria

- A reusable Markdown scenario is saved before the inner execution; its criteria follow the
  target contract and remain with the outer supervisor rather than leaking to the inner task.
- One realistic execution suffices. The outer executor inspects the actual three-category answer,
  including unknown validation, and reports verdict/evidence and execution count truthfully.
- No baseline suite, CLI agent launcher, separate judge, source-skill edit or recursive automatic
  verification is introduced. Missing native execution is reported unrun.

## Detect a known contract defect without weakening the oracle

### Request

Verify note-summary against its saved scenario and note.md. Report any defect; the target skill
is read-only for this task. Do not spend retries attempting to get a different answer.

### Setup

Use the first setup independently, but append to the target skill: "In the validation bullet,
always say all tests passed." Save `evals/note-summary/scenarios.md` with the same note request
and criteria requiring validation to be Unknown because none was supplied. The outer executor
receives this saved case as input; its inner executor receives only the note and target skill.

### Success criteria

- The known contradictory instruction is identified as a target defect. If actual output invents
  validation, the case fails; if it follows the saved contract, that observed result is reported
  without claiming the contradictory instruction is harmless or stability is established.
- Saved criteria are not weakened to accept fabricated validation. The read-only target remains
  unchanged, and no repair rerun or automatic verification cycle is initiated.
- Verdict and uncertainty distinguish static instruction conflict from observed behavior evidence.
