package run

import (
	"context"

	domrun "example.com/runwatch/internal/domain/run"
)

type Executor interface {
	Execute(context.Context, domrun.ExecuteParams) (domrun.ExecuteResult, error)
}
