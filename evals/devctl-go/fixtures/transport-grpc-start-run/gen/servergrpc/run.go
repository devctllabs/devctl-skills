package servergrpc

import "context"

type Code string

const (
	CodeInvalidArgument Code = "invalid_argument"
	CodeNotFound        Code = "not_found"
	CodeConflict        Code = "conflict"
	CodeInternal        Code = "internal"
)

type StatusError struct {
	Code    Code
	Message string
}

func (e *StatusError) Error() string { return e.Message }

type StartRunRequest struct{ ID string }
type StartRunReply struct {
	ID     string
	Status string
}

type RunService interface {
	StartRun(context.Context, *StartRunRequest) (*StartRunReply, error)
}
