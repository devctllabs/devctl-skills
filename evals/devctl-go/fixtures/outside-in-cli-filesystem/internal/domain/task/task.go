package task

import "errors"

type Name string

var ErrConflict = errors.New("conflict")

type CreateCommand struct {
	Name Name
}

type Task struct {
	Name Name `json:"name"`
}
