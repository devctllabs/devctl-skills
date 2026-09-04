package run

type ID string
type StartRunCommand struct{ ID ID }
type RunView struct{ ID ID }
