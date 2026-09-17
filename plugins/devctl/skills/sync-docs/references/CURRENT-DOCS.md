# Current documentation model

Durable current documentation describes the implemented system. Product-document placement and
PDR history are governed by `$product-modeling`; glossary and ADR placement are governed by the
configured `$domain-modeling` layout.

The current documentation entrypoint and architecture default to:

```text
docs/
|-- README.md
`-- architecture/
    |-- overview.md
    |-- data-flow.md       optional
    `-- deployment.md      optional
```

`docs/README.md` is the repository documentation entrypoint. It links every current product and
architecture document. It may link configured glossaries and decision indexes when that makes
them easier to discover.

`docs/architecture/overview.md` is the technical entrypoint. Describe components, boundaries,
interactions, critical flows, and operationally significant constraints without repeating facts
that are obvious from a single source file or configuration lookup. Split out data flow,
deployment, or another architectural view only when the separate view carries enough information
to justify its own lifecycle.

Current documents contain implemented truth, not proposals or discussion history. Link relevant
PDRs and ADRs when their reasons matter. Preserve a coherent existing layout during delta sync;
use these defaults when establishing a new full baseline.

Use Mermaid only when it makes a non-trivial relationship, sequence, state transition, data flow,
or deployment topology easier to understand than prose. Keep each diagram beside the explanation
it supports and use repository rendering or validation tooling when available.

Product roadmaps and planning artifacts remain in the configured issue tracker. This model does
not create or maintain application user guides.
