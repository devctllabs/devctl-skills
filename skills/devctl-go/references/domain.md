# Domain Layer

## Contents

- Role
- Package Layout
- Entity Package Structure
- Operation Contract Naming
- Domain Errors
- Import Rules and Anti-Patterns
- `internal/domain/common`
- Testing

## Role

`internal/domain` describes the application's business vocabulary:

- value objects, identifiers, enums, and domain-specific types;
- command/query inputs for domain operations;
- result/view outputs for domain operations;
- invariants and small domain behavior that does not require infrastructure;
- domain and operational error categories.

`domain` must not know about `service`, `usecase`, `repository`, `client`, `transport`, drivers, protocols, or generated DTOs. It should contain business fields only. Avoid SQL tags, JSON transport DTO details, `sql.Null*`, driver types, and protocol-specific fields.

## Package Layout

```text
internal/domain/
  common/
    errors.go
    money.go
    range.go
    filter.go
    pagination.go
    sorting.go

  order/
    command.go
    query.go
    common.go
    errors.go

  user/
    command.go
    query.go
    common.go
    errors.go
```

Use `domain/common` for types reused by multiple independent domain packages:

- base domain error categories: `ErrNotFound`, `ErrConflict`, `ErrUnavailable`, `ErrInvalid`,
  `ErrForbidden`, `ErrInternal`, `ErrCanceled`, `ErrDeadlineExceeded`, `ErrInvalidState`;
- shared value objects such as money, time ranges, normalized IDs, localized strings;
- shared pagination, sorting, range, and set-filter types.

Use `domain/<entity>` whenever an entity has its own commands, queries, views, value objects, enums, or entity-specific errors.

## Entity Package Structure

Recommended files:

```text
internal/domain/<entity>/
  command.go    # write operations: <Operation>Command, <Operation>Result, ...Params
  query.go      # read operations: <Operation>Query, ...View, ...Filter
  common.go     # optional entity value objects, enums, helper domain types
  errors.go     # optional entity-specific domain errors
```

Rules:

- `command.go` contains write operation inputs/outputs and nested `...Params`.
- `query.go` contains read operation inputs, views, and filters.
- `common.go` contains entity-specific enums/value objects shared by several operations in that entity package.
- `errors.go` contains only meaningful entity-specific domain errors. Prefer common categories first.

## Operation Contract Naming

For each operation:

- Use `<Operation>Command` and `<Operation>Result` for writes.
- Use `<Operation>Query` and `<Entity>View`, `<Entities>View`, or another explicit `...View` for reads.
- Use `...Filter` for selection predicates.
- Use `...Params` for grouped parameters that are not strictly filters or are reused across contracts.

Example write contract:

```go
type OrderItemParams struct {
    SKU       string
    Qty       int
    UnitPrice int64
}

type CreateOrderCommand struct {
    CustomerID string
    Items      []OrderItemParams
    Note       *string
}

type CreateOrderResult struct {
    Order OrderView
}
```

Prefer `...Result` values that contain one or more explicit views plus optional scalars such as flags or timestamps. Avoid arbitrary unrelated fields.

Use named operation contracts at service, usecase, repository-interface, transport-mapper, and
command boundaries. Do not independently represent the same fixed fields as `map[string]any` in
several packages. Maps belong in domain contracts only when their keys are inherently dynamic
domain data; use explicit named key and value types.

Example read contract:

```go
type ListOrdersFilter struct {
    CustomerIDs []string
    Statuses    []OrderStatus
    DateRange   common.TimeRange
}

type ListOrdersQuery struct {
    Filter    ListOrdersFilter
    Page      common.Page
    Sort      common.Sort[OrderSortField]
    WithTotal bool
}

type OrderView struct {
    ID         string
    Status     string
    TotalCents int64
}

type OrdersView struct {
    Items    []OrderView
    PageInfo common.PageInfo
}
```

Use `...Params` when fields describe a mode, format, or reusable parameter group:

```go
type OrderReportFormatParams struct {
    IncludeDetails bool
    Currency       string
    Locale         string
}

type OrderReportQuery struct {
    Filter OrderReportFilter
    Format OrderReportFormatParams
}
```

Contract evolution:

- Adding fields to existing commands, queries, results, or views is acceptable when old fields keep their meaning.
- For breaking changes, introduce `...V2` or move a large redesign into `v2`, `v3`, and so on.
- Keep old contract versions as long as internal callers require them.

## Domain Errors

Domain errors are application categories and optional domain facts, not driver/protocol causes.

Default placement:

- common categories in `internal/domain/common/errors.go`;
- rare entity-specific errors in `internal/domain/<entity>/errors.go`.

Examples:

```go
var (
    ErrNotFound         = errors.New("not found")
    ErrConflict         = errors.New("conflict")
    ErrInvalid          = errors.New("invalid")
    ErrForbidden        = errors.New("forbidden")
    ErrUnavailable      = errors.New("unavailable")
    ErrInternal         = errors.New("internal")
    ErrCanceled         = errors.New("canceled")
    ErrDeadlineExceeded = errors.New("deadline exceeded")
    ErrInvalidState     = errors.New("invalid state")
)
```

Repositories classify low-level errors into these categories while preserving the raw cause for
internal diagnostics, for example `fmt.Errorf("%w: %w", ErrConflict, err)`. Map
`context.Canceled` and `context.DeadlineExceeded` to their matching domain categories while keeping
the context sentinel as the second cause. Services decide from domain/context categories and add
dependency-call context with `%w`; they must not branch on retained driver types. Transport maps
categories to safe protocol responses and never serializes the internal error chain.

Start with central categories. Add entity-specific errors only when a common category loses important business meaning.

Use sentinel category errors by default. They are enough when callers only need to branch on the class of failure:

```go
if errors.Is(err, common.ErrNotFound) {
    // map to 404, retry policy, or caller-specific branch
}
```

Use a typed domain error only when a caller, transport mapper, logger, or test needs structured protocol-independent facts. The category should still be discoverable with `errors.Is`, and details should be discoverable with `errors.As`:

```go
type NotFoundError struct {
    Entity string
    ID     string
}

func (e *NotFoundError) Error() string {
    return e.Entity + " not found"
}

func (e *NotFoundError) Unwrap() error {
    return ErrNotFound
}
```

Validation can use the same shape when business validation needs structured facts:

```go
type ValidationIssue struct {
    Path   []string
    Code   string
    Params map[string]string
}

type ValidationError struct {
    Issues []ValidationIssue
}

func (e *ValidationError) Error() string {
    return "invalid"
}

func (e *ValidationError) Unwrap() error {
    return ErrInvalid
}
```

Keep typed error fields as domain facts: entity kind, identifier, field/path inside a domain command, validation code, retry classification, or conflict reason. Do not put HTTP status codes, gRPC codes, OpenAPI/Proto DTOs, driver errors, localized messages, or UI labels in domain errors.

## Import Rules and Anti-Patterns

Import rules:

- Entity domain packages may import `internal/domain/common`.
- Entity domain packages should not import each other.
- When entities need a relationship, prefer shared identifiers or value objects in `common` instead of direct cross-imports.
- `domain` never imports `service`, `usecase`, `repository`, `client`, or `transport`.

Avoid:

- infrastructure in domain: `db` tags, `json` protocol DTO tags, `sql.Null*`, driver types;
- `map[string]any` or `map[string]interface{}` as an internal command, result, or view;
- transport DTO leakage into domain;
- cross-imports between entity packages;
- random helper packages in `domain/common`;
- duplicated error categories per entity when a shared category is sufficient;
- protocol details such as HTTP Problem Details, gRPC status details, Kafka DLQ policy, or API-generated error DTOs in domain errors.

## `internal/domain/common`

Use `common` for reused domain operation primitives.

Pagination:

```go
const (
    DefaultPageSize = 50
    MaxPageSize     = 500
)

type Page struct {
    Number int
    Size   int
}

type PageInfo struct {
    Number  int
    Size    int
    Total   *int64
    HasNext bool
}

type Cursor struct {
    Value string
    Limit int
}

type CursorInfo struct {
    Next    *string
    HasMore bool
}
```

Sorting:

```go
type SortField[T comparable] struct {
    Field T
    Desc  bool
}

type Sort[T comparable] struct {
    Fields []SortField[T]
}
```

Ranges and set filters:

```go
type Range[T any] struct {
    From *T
    To   *T
}

type TimeRange = Range[time.Time]

type SetFilter[T comparable] struct {
    Include []T
    Exclude []T
}
```

Optional normalize helpers are acceptable when they are domain-level and reusable:

```go
func (p *Page) Normalize(maxSize int) {
    if maxSize <= 0 {
        maxSize = MaxPageSize
    }
    if p.Number < 1 {
        p.Number = 1
    }
    if p.Size <= 0 {
        p.Size = DefaultPageSize
    }
    if p.Size > maxSize {
        p.Size = maxSize
    }
}

func (c *Cursor) Normalize(maxSize int) {
    if maxSize <= 0 {
        maxSize = MaxPageSize
    }
    if c.Limit <= 0 {
        c.Limit = DefaultPageSize
    }
    if c.Limit > maxSize {
        c.Limit = maxSize
    }
}
```

Example:

```go
type PostSortField string

const (
    PostSortByCreatedAt PostSortField = "created_at"
    PostSortByTitle     PostSortField = "title"
)

type ListPostsQuery struct {
    Pagination common.Page
    Sort       common.Sort[PostSortField]
    Filter     PostFilter
    WithTotal  bool
}

type PostFilter struct {
    Authors common.SetFilter[string]
    Status  common.SetFilter[string]
    Date    common.TimeRange
}
```

Use `Sort[string]` as a generic default only when typed enum fields add no value. An empty `Sort[T]{}` means no explicit sort.

## Testing

Keep domain tests beside the owning package. Test value-object normalization, invariants, state
transitions, typed error facts, and `errors.Is`/`errors.As` behavior without dependency doubles.
Exercise zero values and meaningful boundaries for shared pagination, sorting, range, and filter
types. Apply the active owner scenario and the Go assertion policy from `testing-strategy.md`.
