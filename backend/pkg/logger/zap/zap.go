package zap

import (
	"errors"
	"fmt"
	l "log"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"github.com/dbo-studio/dbo/pkg/logger"

	"github.com/dbo-studio/dbo/config"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

type log struct {
	zap *zap.SugaredLogger
}

func New(cfg *config.Config) logger.Logger {
	path := getLogPath(cfg)

	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		err := os.MkdirAll(path, os.ModePerm)
		if err != nil {
			l.Fatalln(err)
		}
	}

	currentDate := time.Now().Format("2006-01-02")
	logFileName := fmt.Sprintf("app-%s.log", currentDate)
	logFilePath := filepath.Join(path, logFileName)

	f, err := os.OpenFile(logFilePath, os.O_RDWR|os.O_CREATE|os.O_APPEND, 0o666)
	fmt.Println("log path: " + logFilePath)
	if err != nil {
		l.Fatalln(err)
	}

	ws := zapcore.AddSync(f)

	encoderConfig := zap.NewProductionEncoderConfig()
	encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	encoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder
	encoderConfig.EncodeCaller = zapcore.ShortCallerEncoder
	enc := zapcore.NewJSONEncoder(encoderConfig)
	core := zapcore.NewCore(enc, ws, zapcore.ErrorLevel)

	z := zap.New(core, zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))
	sugarLogger := z.Sugar()

	return &log{sugarLogger}
}

func (log *log) Error(msg any) {
	l.Println(msg)
	if err, ok := msg.(error); ok {
		log.zap.Errorw("error", "error", err, "stack", getStackTrace())
	} else {
		log.zap.Errorw("error", "message", msg, "stack", getStackTrace())
	}
}

func (log *log) Fatal(msg any) {
	l.Println(msg)
	if err, ok := msg.(error); ok {
		log.zap.Fatalw("error", err, "stack", getStackTrace())
	} else {
		log.zap.Fatalw("message", msg, "stack", getStackTrace())
	}
}

func (log *log) Warn(msg any) {
	l.Println(msg)
	log.zap.Warn(msg)
}

func (log *log) Info(msg any) {
	l.Println(msg)
	log.zap.Info(msg)
}

func getStackTrace() string {
	var pcs [32]uintptr
	n := runtime.Callers(3, pcs[:])
	frames := runtime.CallersFrames(pcs[:n])

	var stack string
	for {
		frame, more := frames.Next()
		stack += fmt.Sprintf("\n\t%s:%d", frame.File, frame.Line)
		if !more {
			break
		}
	}
	return stack
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
