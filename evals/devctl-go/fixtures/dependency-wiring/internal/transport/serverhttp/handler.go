package serverhttp

type Handler struct{ Runs any }

func New(runs any) *Handler { return &Handler{Runs: runs} }
