# Product documentation model

Product documentation separates implemented truth from decision history:

```text
docs/product/
|-- README.md
|-- <capability>.md
`-- decisions/
    `-- NNNN-<slug>.md
```

`docs/product/README.md` defines the product-document boundary and indexes every capability
document. Capability documents are organized around cohesive product concepts rather than code
modules. They describe implemented scenarios, business rules, and constraints without
implementation detail.

`docs/product/decisions/` contains accepted Product Decision Records. PDRs explain why significant
product behavior was chosen; capability documents state what the product does now. Link a PDR when
its reason matters instead of copying its history into current documentation.

Proposed behavior, open questions, System Designs, specs, and tickets live in the configured issue
tracker. A proposal becomes current product documentation only after implementation, through
`$sync-docs`. Git history and PDRs preserve history; current documents carry neither proposal
status nor obsolete behavior.

Create files and directories lazily. A new project may have PDRs before its first capability
document, but it has no current product behavior to document until something is implemented.
