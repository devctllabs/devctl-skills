Evaluate whether the response gives a concrete, repository-specific quality-tooling
standardization plan for the fixture. This is a binary rubric: return a score of 1
only when every criterion below is satisfied; otherwise return 0.

Inspect the workspace when needed to verify claims about the repository. Judge the
candidate response semantically, not by requiring exact wording.

The response must:

1. Recognize that the repository has no established quality convention and recommend
   the complete fallback stack: pytest, Ruff for linting and formatting, strict mypy,
   complexipy, deptry, and Import Linter.
2. Give concrete local or CI commands covering tests, formatting, linting, type
   checking, complexity, dependency hygiene, and import contracts. Paths and commands
   must fit this repository's `src/acme` and `tests` layout; equivalent valid command
   forms are acceptable.
3. Explain that development tools are declared as locked development dependencies
   and that the lockfile is committed. Preserve the existing Hatchling build backend
   and current project structure instead of replacing them or inheriting ambient tool
   versions.
4. Recommend stable, explicit Ruff rules without `select = ["ALL"]` and without
   enabling preview rules by default. Generated-code exclusions must be narrow and
   must not broadly exempt handwritten source. Tests may have narrow documentation,
   assertion, credential, and temporary-path exceptions, but must remain subject to
   `C901` and `PLR` complexity limits; suppressions must be local and justified.
5. Configure strict mypy with `disallow_any_explicit = true`, explain that it is an
   additional gate beyond `strict`, and keep any unavoidable external-boundary
   exception narrow and justified. Do not claim Ruff can semantically reject
   `dict[str, Any]` or distinguish an anonymous record from a dynamic semantic map.
6. Define architecture import contracts only for modules that actually exist in the
   fixture: `domain`, `service`, `repository`, `client`, and `cli`. It must not invent
   absent application layers or propose unnecessary placeholder code, migrations, or
   dummy tests merely to satisfy tools.
7. Honor the read-only planning request: recommend changes but do not claim to have
   edited files or installed dependencies.

Minor differences in formatting, configuration placement, or command spelling are
acceptable when the plan is operationally equivalent. A vague tool list, a
Ruff-only plan, missing verification categories, invented architecture, or advice
that conflicts with the repository is a score of 0.
