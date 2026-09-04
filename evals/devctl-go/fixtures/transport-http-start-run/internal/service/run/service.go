package run

import (
	"context"

	domrun "example.com/runwatch/internal/domain/run"
)

type Service struct{}

func New() *Service { return &Service{} }

func (*Service) Start(context.Context, domrun.StartRunCommand) (domrun.RunView, error) {
	return domrun.RunView{}, nil
}
