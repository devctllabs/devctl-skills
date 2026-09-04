package deps

import "context"

type ConfigService struct{}

func (ConfigService) Path(user bool) string {
	if user {
		return "/user/config.toml"
	}
	return "/project/config.toml"
}

func (ConfigService) Validate(user bool) string {
	return "valid " + ConfigService{}.Path(user)
}

type PackageService struct{}

func (PackageService) List() []string { return []string{"core", "software"} }

type App struct{}

func New(context.Context) (*App, error) { return &App{}, nil }

func (*App) Config() ConfigService    { return ConfigService{} }
func (*App) Packages() PackageService { return PackageService{} }
