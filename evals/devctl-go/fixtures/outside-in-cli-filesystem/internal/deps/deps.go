package deps

import (
	"context"
	"errors"

	domtask "example.com/runwatch/internal/domain/task"
)

type Creator interface {
	Create(context.Context, domtask.CreateCommand) (domtask.Task, error)
}

type Container interface {
	Creator() Creator
}

var ErrNotImplemented = errors.New("runtime graph not implemented")

func New(string) (Container, error) {
	return nil, ErrNotImplemented
}
