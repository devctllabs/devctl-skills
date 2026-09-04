package codex

import "io"

type Client struct{ io.Closer }

func New() *Client { return &Client{Closer: io.NopCloser(nil)} }
