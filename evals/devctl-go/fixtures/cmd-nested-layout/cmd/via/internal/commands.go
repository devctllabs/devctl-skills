package internal

import (
	"context"
	"fmt"

	"github.com/urfave/cli/v3"
)

type ConfigService interface {
	Path(bool) string
	Validate(bool) string
}

type PackageService interface {
	List() []string
}

type Dependencies interface {
	Config() ConfigService
	Packages() PackageService
}

type DependenciesBuilder func(context.Context) (Dependencies, error)

func NewRootCommand(build DependenciesBuilder) *cli.Command {
	return &cli.Command{
		Name:  "via",
		Usage: "Manage VIA configuration and packages",
		Commands: []*cli.Command{
			newConfigCommand(build),
			newPackageCommand(build),
		},
	}
}

func newConfigCommand(build DependenciesBuilder) *cli.Command {
	return &cli.Command{
		Name:  "config",
		Usage: "Inspect VIA configuration",
		Commands: []*cli.Command{
			{
				Name:  "path",
				Usage: "Print the selected config path",
				Flags: []cli.Flag{&cli.BoolFlag{Name: "user"}},
				Action: func(ctx context.Context, cmd *cli.Command) error {
					app, err := build(ctx)
					if err != nil {
						return err
					}
					_, err = fmt.Fprintln(cmd.Root().Writer, app.Config().Path(cmd.Bool("user")))
					return err
				},
			},
			{
				Name:  "validate",
				Usage: "Validate the selected config",
				Flags: []cli.Flag{&cli.BoolFlag{Name: "user"}},
				Action: func(ctx context.Context, cmd *cli.Command) error {
					app, err := build(ctx)
					if err != nil {
						return err
					}
					_, err = fmt.Fprintln(cmd.Root().Writer, app.Config().Validate(cmd.Bool("user")))
					return err
				},
			},
		},
	}
}

func newPackageCommand(build DependenciesBuilder) *cli.Command {
	return &cli.Command{
		Name:  "package",
		Usage: "Inspect installed packages",
		Commands: []*cli.Command{
			{
				Name:  "list",
				Usage: "List installed packages",
				Action: func(ctx context.Context, cmd *cli.Command) error {
					app, err := build(ctx)
					if err != nil {
						return err
					}
					for _, name := range app.Packages().List() {
						if _, err := fmt.Fprintln(cmd.Root().Writer, name); err != nil {
							return err
						}
					}
					return nil
				},
			},
		},
	}
}
