package internal

import (
	"bytes"
	"context"
	"testing"
)

type fakeConfig struct{}

func (fakeConfig) Path(bool) string     { return "/test/config.toml" }
func (fakeConfig) Validate(bool) string { return "valid /test/config.toml" }

type fakePackages struct{}

func (fakePackages) List() []string { return []string{"core", "software"} }

type fakeDeps struct{}

func (fakeDeps) Config() ConfigService    { return fakeConfig{} }
func (fakeDeps) Packages() PackageService { return fakePackages{} }

func TestCLIBehavior(t *testing.T) {
	tests := []struct {
		name string
		args []string
		want string
	}{
		{name: "config path", args: []string{"via", "config", "path"}, want: "/test/config.toml\n"},
		{name: "config validate", args: []string{"via", "config", "validate"}, want: "valid /test/config.toml\n"},
		{name: "package list", args: []string{"via", "package", "list"}, want: "core\nsoftware\n"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			var output bytes.Buffer
			root := NewRootCommand(func(context.Context) (Dependencies, error) {
				return fakeDeps{}, nil
			})
			root.Writer = &output
			if err := root.Run(context.Background(), test.args); err != nil {
				t.Fatalf("run: %v", err)
			}
			if output.String() != test.want {
				t.Fatalf("output %q, want %q", output.String(), test.want)
			}
		})
	}
}

func TestRootHelpDoesNotBuildDependencies(t *testing.T) {
	var output bytes.Buffer
	root := NewRootCommand(func(context.Context) (Dependencies, error) {
		t.Fatal("help constructed dependencies")
		return nil, nil
	})
	root.Writer = &output
	if err := root.Run(context.Background(), []string{"via", "--help"}); err != nil {
		t.Fatalf("help: %v", err)
	}
}
