package consumerkafka

import "context"

type Consumer struct{ Runs any }

func New(runs any) *Consumer { return &Consumer{Runs: runs} }
func (c *Consumer) Consume(context.Context) error { return nil }
