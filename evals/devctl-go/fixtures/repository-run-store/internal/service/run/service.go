package run

import (
	"context"

	domrun "example.com/runwatch/internal/domain/run"
)

type Repository interface {
	Load(context.Context, domrun.ID) (domrun.RunView, error)
	Save(context.Context, domrun.RunView) error
}
