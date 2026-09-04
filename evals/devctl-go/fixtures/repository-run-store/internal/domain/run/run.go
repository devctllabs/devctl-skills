package run

import "errors"

type ID string
type Status string

const StatusPending Status = "pending"

var (
	ErrNotFound = errors.New("not found")
	ErrInternal = errors.New("internal")
)

type RunView struct {
	ID     ID
	Status Status
}
