package run

import "errors"

type ID string

var (
	ErrConflict    = errors.New("conflict")
	ErrUnavailable = errors.New("unavailable")
)

type StartRunCommand struct{ ID ID }
type RunView struct{ ID ID }
