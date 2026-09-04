package broker

import "context"

type Message struct {
	ID    string
	Value []byte
}

type Reader interface {
	Fetch(context.Context) (Message, error)
	Ack(context.Context, Message) error
}

type DLQ interface {
	Publish(context.Context, Message, string) error
}
