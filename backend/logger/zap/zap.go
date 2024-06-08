package zap

import (
	"errors"
	"github.com/khodemobin/dbo/config"
	l "log"
	"os"
	"path/filepath"
	"runtime"

	"github.com/khodemobin/dbo/logger"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

type log struct {
	zap *zap.SugaredLogger
}

func New(cfg *config.Config) logger.Logger {
	path := getLogPath(cfg)

	//create dir if not exists
	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		err := os.MkdirAll(path, os.ModePerm)
		if err != nil {
			l.Fatalln(err)
		}
	}

	f, err := os.OpenFile(path+"/app.log", os.O_RDWR|os.O_CREATE|os.O_APPEND, 0o666)
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

func getLogPath(cfg *config.Config) string {
	defaultPath := "data/logs"
	var logPath string
	appName := cfg.App.Name

	if cfg.App.Env == "docker" {
		return defaultPath
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		l.Println(err.Error())
		return defaultPath
	}

	switch runtime.GOOS {
	case "windows":
		appData := os.Getenv("APPDATA")
		l.Println("APPDATA environment variable not set")
		if appData == "" {
			return defaultPath
		}
		logPath = filepath.Join(appData, appName, "logs")
	case "darwin":
		logPath = filepath.Join(homeDir, "Library", "Application Support", appName, "logs")
	case "linux":
		logPath = filepath.Join(homeDir, "."+appName, "logs")
	default:
		l.Println("unsupported platform")
		return defaultPath
	}

	return logPath
}
