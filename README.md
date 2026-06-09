# Devctl Skills

A curated set of development skills for AI coding agents.

Each skill gives focused guidance, defaults, and reference material for a
specific kind of engineering work.

## Available Skills

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

## Installation

Copy one or more folders from `skills/` into the skills directory supported by
your agent runtime. Keep the folder names unchanged so prompts can reference the
same skill names.

## Usage

Invoke the skill by name in prompts, for example:

```text
Use $devctl-openapi to add a new resource domain to this OpenAPI 3.1 contract.
Use $devctl-react-vite to organize this React + Vite app structure.
```

Skills are designed for progressive disclosure: start with `SKILL.md`, then load
only the reference files that match the task.

## Skill Structure

```text
skills/
  <skill-name>/
    SKILL.md              # Skill metadata and primary instructions
    agents/openai.yaml    # UI metadata for skill lists and prompts
    references/           # Detailed guidance loaded only when relevant
```

Each skill can also include scripts or assets when deterministic helpers or
reusable files are useful for the task.

## License

Apache-2.0. See [LICENSE](LICENSE).
