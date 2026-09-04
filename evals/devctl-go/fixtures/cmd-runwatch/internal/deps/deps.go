package deps

import "context"

type Consumer interface {
	Consume(context.Context) error
}

type Container interface {
	GetConsumer(string) (Consumer, error)
	Shutdown(context.Context) error
}

var New = func() (Container, error) { return nil, nil }
