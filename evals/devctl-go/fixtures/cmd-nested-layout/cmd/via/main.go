package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	cmdinternal "example.com/via/cmd/via/internal"
	"example.com/via/internal/deps"
)

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()
	root := cmdinternal.NewRootCommand(func(ctx context.Context) (cmdinternal.Dependencies, error) {
		app, err := deps.New(ctx)
		if err != nil {
			return nil, err
		}
		return appDependencies{app: app}, nil
	})
	if err := root.Run(ctx, os.Args); err != nil {
		os.Exit(1)
	}
}

type appDependencies struct{ app *deps.App }

func (a appDependencies) Config() cmdinternal.ConfigService    { return a.app.Config() }
func (a appDependencies) Packages() cmdinternal.PackageService { return a.app.Packages() }
