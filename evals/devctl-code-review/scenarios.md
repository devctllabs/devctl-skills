# devctl-code-review scenarios

## Introduced boundary defect

### Request

Review only the staged change against requirements.md. Report merge readiness; do not fix files.

### Setup

Create a disposable Git repository with `requirements.md` saying: "A withdrawal of any positive
amount up to and including the balance succeeds. Other amounts raise ValueError." Commit
`wallet.py` with `withdraw(balance, amount)` returning `balance - amount` when
`0 < amount <= balance`, otherwise raising `ValueError`. Stage a change replacing `<=` with `<`.
Include a committed unittest covering a partial withdrawal and documented command
`python3 -m unittest discover -s tests`. The supervisor prepares the commits/index before dispatch.
Provide `skills/devctl-code-review/SKILL.md` and resources. Run review lanes in single-agent
fallback if an overall execution budget disallows extra agents; state that constraint explicitly.

### Success criteria

- The review pins the cached comparison and finds the full-balance regression with precise
  file/line, requirement, impact and fix direction. Independently reproduce `withdraw(10, 10)`.
- The same defect is not counted multiple times. The severity and verdict follow the current
  skill's rules; an evidenced requirements failure is HIGH and REQUEST CHANGES.
- All three lanes are accounted for, test evidence is truthful, and source/index remain unchanged.

## Clean scoped change with an unrelated old defect

### Request

Review only the staged change against requirements.md. Report merge readiness; do not fix files.

### Setup

Use a separate disposable Git repository. Commit the correct wallet and requirement from the
first setup, tests for partial/full/invalid withdrawals, and an unrelated `legacy.py` containing
`def average(values): return sum(values) / len(values)`. Stage only a wallet docstring explaining
the already implemented full-balance behavior. Provide the same skill and lane-budget constraint.

### Success criteria

- Review reports no invented change defect; the old empty-average problem is outside this scope.
- Requirements and checks are accounted for and the verdict is APPROVE in the absence of a real
  validation gap. No confidence score or taste-only findings are substituted for evidence.
- The cached diff and working tree remain unchanged.
