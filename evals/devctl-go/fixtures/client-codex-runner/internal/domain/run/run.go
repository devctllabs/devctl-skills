package run

import "errors"

type ID string

var ErrUnavailable = errors.New("unavailable")

type ExecuteParams struct {
	RunID  ID
	Prompt string
}

type ExecuteResult struct{ ExecutionID string }
