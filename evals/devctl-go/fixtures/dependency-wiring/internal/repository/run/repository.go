package run

import "io"

type Repository struct{ io.Closer }

func New() *Repository { return &Repository{Closer: io.NopCloser(nil)} }
