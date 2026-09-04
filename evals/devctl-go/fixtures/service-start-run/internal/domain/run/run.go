package run

import "errors"

type ID string
type Status string

const (
	StatusPending Status = "pending"
	StatusRunning Status = "running"
)

var (
	ErrNotFound    = errors.New("not found")
	ErrConflict    = errors.New("conflict")
	ErrUnavailable = errors.New("unavailable")
)

type StartRunCommand struct{ ID ID }
type RunView struct {
	ID     ID
	Status Status
}
