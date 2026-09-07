# Devctl Skills

A curated set of development skills for AI coding agents, distributed both as
standalone skills and as an installable Codex plugin.

Each skill gives focused guidance, defaults, and reference material for a
specific kind of engineering work.

## Available Skills

### pragmatic-work

An explicit-only modifier that applies DRY, YAGNI, KISS, and SOLID pragmatically to any LLM task.
It favors the simplest complete result, avoids repetition and speculative scope, and keeps
responsibilities and dependencies clear.

### outside-in-tdd

A language-neutral outside-in TDD process for handwritten production behavior.

**Use when:**

- Growing a feature from its caller-visible boundary
- Fixing a bug regression-first
- Evolving a public contract through tests
- Establishing GREEN characterization before a behavior-preserving refactor

**Covers:**

- Scenario-sized RED/GREEN/SIMPLIFY cycles
- ZOM progression with continuous Boundary, Interface, and Exception checks
- Natural GREEN, owner checkpoints, and outside-in descent
- Post-GREEN composition with `simplify-code`

### simplify-code

Behavior-preserving simplification for a current change, complex function, section, or module.

**Use when:**

- Reducing nested control flow, duplication, or unnecessary indirection
- Simplifying a targeted module without changing its public behavior
- Running the simplification phase after a TDD GREEN

**Covers:**

- Scope control and GREEN safety nets
- Public characterization when existing coverage is insufficient
- Private-structure refactoring under a frozen behavior oracle
- Safe migration away from implementation-coupled tests

### devctl

The entrypoint for Devctl-managed projects, manifests, CLI workflows, and
implementation-skill routing.

**Use when:**

- Interviewing for a new project's shape
- Creating or updating `devctl.yaml`
- Running Devctl initialization, synchronization, linting, or generation
- Choosing the language, frontend, or contract skill for follow-up work

**Covers:**

- Project and component discovery
- Declarative manifests and environment configuration
- Safe CLI workflows for `validate`, `inspect`, `sync`, `lint`, and `gen`
- Routing to the matching `devctl-*` skill

### devctl-baseline-docs

An explicit-only discovery workflow for establishing accepted product and technical context in an
existing repository.

**Use when:**

- Performing a project's initial technical and domain discovery
- Establishing current product and architecture docs, `CONTEXT.md`, PDRs, and ADRs
- Resolving repository ambiguities with the project owner before documenting them

**Covers:**

- Evidence-led coverage of every subsystem, boundary, integration, and critical flow
- Owner interviews with explicit resolution or deferral of ambiguities
- One approval gate before writing current docs, confirmed glossary terms, PDRs, and ADRs

### product-modeling

An automatically available discipline for sharpening product behavior and recording only
significant accepted Product Decision Records.

**Covers:**

- Concrete product scenarios, business rules, constraints, and decision authority
- Separation of current behavior, proposed behavior, and open product questions
- Strict PDR qualification and sequential `docs/product/decisions/` records

### product-questions

An explicit-only companion to feature interviews that maintains product questions and faithful
answers in the configured issue tracker.

**Covers:**

- One question artifact per feature with stable `PQ-NNN` identifiers
- Blocking branches, optional team proposals, and free-form product responses
- In-place updates and tracker closure after every question is answered

### to-system-design

An explicit-only synthesis step that publishes a reviewable System Design before implementation
planning.

**Covers:**

- Adaptive feature design with useful Mermaid diagrams
- Proposed, Accepted, and Implemented lifecycle states
- Review feedback updates in place and explicit handoff to `to-spec`

### reconcile-docs

An explicit-only post-implementation workflow for reconciling actual behavior with durable current
documentation.

**Covers:**

- Product, architecture, glossary, PDR, and ADR impact discovery
- Drift detection before promoting implementation as current truth
- System Design implementation links and current-doc updates

### devctl-go

Go architecture guidance for services, reusable libraries, packages, and
multi-library monorepos.

**Use when:**

- Creating, organizing, refactoring, or reviewing Go projects
- Designing package APIs, services, use cases, repositories, or clients
- Adding transport adapters, dependency wiring, configuration, or migrations
- Establishing tests, observability, deployment packaging, or quality tooling

**Covers:**

- Inward dependency boundaries and consumer-owned interfaces
- Domain, service, use-case, repository, client, platform, and transport layers
- Outside-in TDD, gomock/mockgen, and Go-native verification
- Runtime lifecycle, generated code, monorepos, Docker, Helm, and Kubernetes

### devctl-openapi

OpenAPI 3.1 contract guidance for compact, downstream-friendly API schemas.

**Use when:**

- Authoring or reviewing OpenAPI 3.1 contracts
- Adding resource domains, paths, or operations
- Designing request and response schemas
- Standardizing error responses or validation issue contracts

**Covers:**

- Root contracts with domain files and shared components
- Strict object schemas, identifiers, timestamps, enums, and examples
- Operation IDs, request bodies, responses, and status conventions
- Problem details, facts-based validation errors, and localized-string boundaries
- `oneOf` plus discriminator patterns for variant schemas

### devctl-python

Python architecture guidance for services, libraries, packages, CLI
applications, and multi-package repositories.

**Use when:**

- Creating, organizing, refactoring, or reviewing Python projects
- Designing package APIs, services, use cases, repositories, or clients
- Adding HTTP, gRPC, messaging, CLI, configuration, or migration boundaries
- Establishing pytest strategy, observability, packaging, or quality tooling

**Covers:**

- `pyproject.toml`, src-layout packages, and typed public APIs
- Domain, service, use-case, repository, client, platform, and transport layers
- Consumer-owned protocols, outside-in TDD, uv, Ruff, pytest, and typing
- Runtime wiring, generated code, monorepos, Docker, Helm, and Kubernetes

### devctl-react-vite

React + Vite + TypeScript project structure guidance for feature-oriented apps.

**Use when:**

- Creating, organizing, refactoring, or migrating React + Vite apps
- Defining feature modules, shared code, and app-wide infrastructure
- Wiring routes, pages, services, generated API code, or dependency injection
- Adding form validation, i18n, UI states, Storybook coverage, or tests

**Covers:**

- Project structure and module boundaries
- TanStack Router file-based routes and route-facing page composition
- Service boundaries, error handling, and React Query data flow
- React Hook Form, Zod validation, i18n resources, and document locale metadata
- Storybook stories, UI loading/error/empty states, and testing conventions

### devctl-obsidian-react

Obsidian plugin architecture guidance for TypeScript plugins with React surfaces.

**Use when:**

- Creating, organizing, refactoring, reviewing, or releasing Obsidian plugins
- Building React views or complex settings inside the Obsidian host lifecycle
- Adding vault operations, commands, events, mobile support, or plugin persistence
- Establishing Vitest, Storybook, real-Obsidian E2E, CI, or release packaging

**Covers:**

- Scale-sensitive project structure and narrow Obsidian adapter boundaries
- React mount/unmount ownership, host-native UI, and Obsidian-safe styling
- Settings migrations, state subscriptions, data safety, mobile, security, and performance
- esbuild production bundles, Storybook/Vitest isolation, sandbox-vault E2E, and releases

### devctl-rust

Rust architecture guidance for reusable crates, Cargo workspaces, servers,
CLIs, workers, and Tauri applications.

**Use when:**

- Creating, organizing, refactoring, or reviewing Rust projects
- Designing crate APIs, services, use cases, repositories, or clients
- Adding delivery crates, async runtime wiring, generated code, or migrations
- Establishing tests, observability, deployment packaging, or quality tooling

**Covers:**

- Minimal crate graphs, reusable application cores, and inward dependencies
- Domain, service, use-case, repository, client, platform, and delivery modules
- Consumer-owned traits, outside-in TDD, Cargo checks, and Clippy
- Tauri/UI monorepos, Docker, Compose, Helm, and Kubernetes

## Product and System Documentation Workflow

Use the documentation workflow to establish an existing repository's baseline, review feature
designs before implementation planning, and reconcile current docs after delivery.

```text
$devctl-baseline-docs
→ $grill-with-docs + $product-questions
→ $to-system-design
→ $to-spec
→ $to-tickets
→ implementation
→ $reconcile-docs
```

`product-modeling` activates automatically when product behavior is discussed. See the
[Product and System Documentation Workflow](docs/documentation-workflow.md) for prerequisites,
standard prompts, optional paths, and feedback loops.

## Install the Codex Plugin

Add the GitHub repository as a marketplace, then install the plugin:

```bash
codex plugin marketplace add devctllabs/devctl-skills
codex plugin add devctl@devctl
```

Start a new Codex session after installation so the bundled skills are loaded.

For local development, add the repository checkout instead:

```bash
codex plugin marketplace add .
codex plugin add devctl@devctl
```

## Install Standalone Skills

Copy one or more folders from `skills/` into a skills directory supported by
your agent runtime. Keep folder names unchanged so prompts can reference the
same skill names.

Invoke a skill explicitly when needed:

```text
Use $pragmatic-work to keep this task simple, focused, and well-structured.
Use $devctl-baseline-docs to establish this repository's accepted product and technical documentation baseline.
Use $product-questions alongside a feature interview to capture questions that need product input.
Use $to-system-design to publish an agreed feature design for review before running $to-spec.
Use $reconcile-docs after implementation to align current product and architecture docs with the actual change.
Use $devctl to create a project manifest and choose the implementation skill.
Use $devctl-openapi to add a resource domain to an OpenAPI 3.1 contract.
Use $devctl-react-vite to organize a React + Vite TypeScript application.
Use $devctl-obsidian-react to build a lifecycle-safe Obsidian plugin with React surfaces.
Use $outside-in-tdd to grow a behavior through scenario-sized TDD cycles.
Use $simplify-code to reduce cognitive complexity without changing public behavior.
```

Skills use progressive disclosure: start with `SKILL.md`, then load only the
references relevant to the task.

## Plugin Maintenance

The selected directories under root `skills/` are the source of truth. The installable bundle
under `plugins/devctl/skills/` is generated and committed to the repository.

Regenerate the bundle after changing a Devctl skill:

```bash
python3 scripts/sync_devctl_plugin.py
```

Check for drift without modifying files:

```bash
python3 scripts/sync_devctl_plugin.py --check
```

The synchronizer includes current and future directories named `devctl` or `devctl-*` plus the
explicitly listed shared composition and documentation skills.

## Skill Structure

```text
skills/
  <skill-name>/
    SKILL.md
    agents/openai.yaml
    references/
```

Skills can also include scripts and assets when deterministic helpers or
reusable files are useful.

## License

Apache-2.0. See [LICENSE](LICENSE).
