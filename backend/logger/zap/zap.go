package zap

import (
	l "log"
	"os"

	"github.com/khodemobin/dbo/logger"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

type log struct {
	zap *zap.SugaredLogger
}

func New() logger.Logger {
	f, err := os.OpenFile("logs/app.log", os.O_RDWR|os.O_CREATE|os.O_APPEND, 0o666)
	if err != nil {
		l.Fatalln(err)
	}

	ws := zapcore.AddSync(f)

	encoderConfig := zap.NewProductionEncoderConfig()
	encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	encoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder
	enc := zapcore.NewJSONEncoder(encoderConfig)
	core := zapcore.NewCore(enc, ws, zapcore.ErrorLevel)

	z := zap.New(core)
	sugarLogger := z.Sugar()

	return &log{sugarLogger}
}

func (log *log) Error(msg any) {
	l.Println(msg)
	log.zap.Error(msg)
}

func (log *log) Fatal(msg any) {
	l.Println(msg)
	log.zap.Fatal(msg)
}

func (log *log) Warn(msg any) {
	l.Println(msg)
	log.zap.Warn(msg)
}

func (log *log) Info(msg any) {
	l.Println(msg)
	log.zap.Info(msg)
}
