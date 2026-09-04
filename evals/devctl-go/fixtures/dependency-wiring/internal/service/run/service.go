package run

type Service struct {
	Repository any
	Executor   any
}

func New(repository, executor any) *Service {
	return &Service{Repository: repository, Executor: executor}
}
