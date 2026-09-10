package logger

type Logger interface {
	Error(msg any)
	Fatal(msg any)
	Warn(msg any)
	Info(msg any)
}
