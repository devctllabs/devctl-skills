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

### devctl-code-review

Evidence-based, read-only merge-readiness review for a scoped change.

**Use when:**

- Reviewing a staged diff, commit, commit interval, branch, or pull request
- Checking a change against requirements and repository standards
- Looking for engineering defects or architectural risks before merge

**Covers:**

- Explicit scope resolution with wider caller, test, and configuration context
- Independent Spec, Engineering, and Architecture review lanes with a portable fallback
- Evidence-backed HIGH, MEDIUM, and LOW findings
- Deterministic APPROVE, COMMENT, or REQUEST CHANGES verdicts

### devctl

The entrypoint for Devctl-managed Go projects, manifests, and explicit CLI workflows.

**Use when:**

- Interviewing for a new project's shape
- Creating or updating `devctl.yaml`
- Running Devctl initialization, synchronization, linting, or generation
- Handing OpenAPI or handwritten Go work to its owning skill

**Covers:**

- Project and component discovery
- Declarative manifests and environment configuration
- Safe CLI workflows for `validate`, `inspect`, `sync`, `lint`, and `gen`
- Clear manifest, contract, generated, and handwritten ownership

### grill-with-product-docs

An explicit-only interview facade that composes Matt Pocock's grilling and domain modeling with
Devctl product modeling.

**Use when:**

- Shaping a new project as its first product initiative
- Resolving a feature's product, domain, and design decisions
- Returning to an interview after product or design feedback

**Covers:**

- One invocation for `grilling`, `domain-modeling`, and `product-modeling`
- Glossary, ADR, product-decision, PDR, and deferred-question capture
- A clear handoff to `to-system-design` or directly to `to-spec`

### product-modeling

An automatically available discipline for sharpening product behavior, maintaining product
documentation policy, and recording only significant accepted Product Decision Records.

**Covers:**

- Concrete product scenarios, business rules, constraints, and decision authority
- Separation of current behavior, proposed behavior, and open product questions
- Strict PDR qualification and sequential `docs/product/decisions/` records
- Lazy tracker artifacts for product decisions that need later thought or external approval

### sync-docs

An explicit-only workflow that synchronizes durable documentation with an implemented system.

**Use when:**

- Establishing the first complete documentation baseline for an existing project
- Reconciling one implemented feature, branch, commit, or reviewed change
- Resolving drift between implementation and accepted decisions before updating current truth

**Covers:**

- Full and delta synchronization scopes inferred from the request
- Product, architecture, glossary, PDR, ADR, and index updates behind one approval gate
- System Design transition from Accepted to Implemented

### to-system-design

An explicit-only synthesis step that publishes a reviewable System Design before implementation
planning.

**Covers:**

- Adaptive feature design with useful Mermaid diagrams
- Proposed, Accepted, and Implemented lifecycle states
- Review feedback updates in place and explicit handoff to `to-spec`

### devctl-go

Compact Go architecture and development guidance for services, CLIs, reusable libraries, and
monorepos.

**Use when:**

- Creating, organizing, refactoring, or reviewing Go projects
- Designing domain, service, use-case, repository, client, or delivery boundaries
- Adding CLI commands, dependency wiring, configuration, lifecycle, or migrations
- Establishing tests, generation, observability, packaging, or quality tooling

**Covers:**

- Meaning-owned policy, inward dependencies, and consumer-owned capability seams
- Concrete repositories, clients, transports, protocol mapping, and access boundaries
- Outside-in TDD, gomock/mockgen, Go-native verification, and generated-contract ownership
- CLI, DI, runtime lifecycle, go-libs integration, monorepos, Docker, Helm, and Kubernetes

### devctl-openapi

Toolchain-agnostic OpenAPI 3.1 contract design with a strict Devctl house style.

**Use when:**

- Authoring or reviewing OpenAPI 3.1 contracts
- Adding resource domains, paths, or operations
- Designing request and response schemas
- Standardizing error responses or validation issue contracts

**Covers:**

- Scale-adaptive single-file and domain-split contracts
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

Use the documentation workflow to shape a project or feature, optionally review its System Design,
and synchronize current docs after delivery. A new project follows the feature flow as its first
initiative; an undocumented existing project starts with a full `$sync-docs` run.

```text
$grill-with-product-docs
→ [$to-system-design]
→ $to-spec
→ $to-tickets
→ implementation
→ $sync-docs
```

Run `$setup-matt-pocock-skills` once before the first publishing workflow. See the
[Product and System Documentation Workflow](docs/documentation-workflow.md) for the existing
project on-ramp, standard prompts, optional paths, and feedback loops.

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
Use $grill-with-product-docs to shape a new project or feature and capture its durable decisions.
Use $sync-docs to establish an existing project's documentation baseline or reconcile an implemented change.
Use $to-system-design to publish an agreed feature design for review before running $to-spec.
Use $devctl to create a project manifest and choose the implementation skill.
Use $devctl-openapi to design or extend an OpenAPI 3.1 contract without assuming a generator.
Use $devctl-react-vite to organize a React + Vite TypeScript application.
Use $devctl-obsidian-react to build a lifecycle-safe Obsidian plugin with React surfaces.
Use $outside-in-tdd to grow a behavior through scenario-sized TDD cycles.
Use $simplify-code to reduce cognitive complexity without changing public behavior.
Use $devctl-code-review to review a staged diff, commit, branch, or pull request before merge.
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

## Skill Verification

Reusable behavior scenarios and minimal fixtures live under [evals/](evals/README.md).
Use `skill-creator-evals` to select and execute the cases relevant to a skill change.

## License

Apache-2.0. See [LICENSE](LICENSE).
