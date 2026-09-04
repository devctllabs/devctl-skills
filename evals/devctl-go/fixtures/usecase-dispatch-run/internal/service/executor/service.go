package executor

import (
	"context"

	domrun "example.com/runwatch/internal/domain/run"
)

type Service struct{}

func New() *Service { return &Service{} }

func (*Service) Submit(context.Context, domrun.RunView) (domrun.DispatchResult, error) {
	return domrun.DispatchResult{}, nil
}
