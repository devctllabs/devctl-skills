package run

import "errors"

type ID string
type Status string

var (
	ErrNotFound = errors.New("not found")
	ErrConflict = errors.New("conflict")
)

type StartRunCommand struct{ ID ID }
type RunView struct {
	ID     ID
	Status Status
}
