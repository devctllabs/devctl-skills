# System Design format

A System Design is the reviewable proposed HOW for one feature. It is not current architecture,
an ADR, a PDR, or an implementation ticket.

## Core document

```md
# <Feature> System Design

Status: Proposed | Accepted | Implemented
Date: YYYY-MM-DD

## Context

## Goals and Non-goals

## Proposed Design

## Impact and Risks

## Decision Records
```

The date is the date of the current status transition. Link relevant ADRs and PDRs under Decision
Records instead of repeating their rationale.

Add only the sections needed to make this design reviewable:

- `## Current State` when the delta is unclear without a baseline.
- `## Components and Interfaces` for changed ownership, boundaries, or contracts.
- `## Data and Critical Flows` for storage, messaging, consistency, or multi-step behavior.
- `## Failure Modes` for partial failure, recovery, or degraded behavior.
- `## Security and Operations` for trust boundaries, authorization, privacy, observability, or
  operational constraints.
- `## Migration and Rollout` for compatibility, data migration, staged delivery, or rollback.
- `## Alternatives` for review-relevant alternatives not already captured by a decision record.
- `## Open Questions` only for non-blocking follow-ups. An Accepted design has no blocking open
  questions.

## Mermaid

Use Mermaid when a relationship, sequence, state transition, data flow, or deployment topology is
materially easier to review visually than in prose. Place the diagram beside the section it
explains. A diagram must agree with the surrounding text and use repository rendering or
validation tooling when available. Do not add a diagram merely to satisfy a template.

## Boundaries

Describe architectural shape, ownership, contracts, flows, risks, and rollout decisions. Leave
file-level task decomposition, exhaustive user stories, and detailed test planning to `to-spec`
and `to-tickets`. Link current product and architecture documents for baseline facts rather than
copying them.
