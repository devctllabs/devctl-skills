# Current documentation model

The baseline separates current truth from decision history:

```text
docs/product/            WHAT the product does now
docs/product/decisions/  WHY THIS WHAT — why significant product behavior was chosen
docs/architecture/       HOW the system works now
docs/adr/                WHY THIS HOW — why significant technical architecture was chosen
```

`CONTEXT.md` remains a domain glossary. It contains no product requirements or implementation
details.

## Lazy structure

Create only files supported by discovered behavior and architecture:

```text
CONTEXT.md
docs/
|-- README.md
|-- product/
|   |-- README.md
|   |-- <capability>.md
|   `-- decisions/
|       `-- NNNN-<slug>.md
|-- architecture/
|   |-- overview.md
|   |-- data-flow.md       optional
|   `-- deployment.md      optional
`-- adr/
    `-- NNNN-<slug>.md
```

`docs/README.md` is the entrypoint and links to every current product and architecture document.
`docs/product/README.md` defines the product-document boundary and indexes capability documents.
Create capability files around cohesive product concepts, not code modules. They describe current
scenarios, business rules, and constraints without implementation detail.

`docs/architecture/overview.md` is the technical entrypoint. Split out data flow, deployment, or
another architectural view only when the separate view carries enough information to justify its
own lifecycle. Describe components, boundaries, interactions, critical flows, and operationally
significant constraints without repeating facts that are directly obvious from one source file or
configuration lookup.

Current documents contain neither planned behavior nor proposal status. Git history and decision
records carry history. Link to a PDR or ADR when its reason matters; do not copy the decision
record into the current document.

Use Mermaid only when it makes a non-trivial relationship, sequence, state transition, data flow,
or deployment topology easier to understand than prose. Keep the source in the document beside
the explanation it supports and use repository rendering or validation tooling when available.

Product roadmaps remain in the configured issue tracker. Do not add roadmap links or user guides
to this baseline.
