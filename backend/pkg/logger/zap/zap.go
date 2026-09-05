package zap

import (
	"errors"
	"fmt"
	l "log"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/pkg/logger"
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
	if err != nil {
		l.Fatalln(err)
	}

	cfg.App.LogPath = logFilePath

	ws := zapcore.AddSync(f)

	encoderConfig := zap.NewProductionEncoderConfig()
	encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	encoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder
	encoderConfig.EncodeCaller = zapcore.ShortCallerEncoder
	enc := zapcore.NewJSONEncoder(encoderConfig)

	// The file sink records everything at Info and above; Info/Warn are part
	// of the operation trail (job lifecycle, shutdown) and must reach it.
	core := zapcore.NewCore(enc, ws, zapcore.InfoLevel)

	z := zap.New(core, zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))

	return &log{z.Sugar()}
}

func (log *log) Error(msg any) {
	if err, ok := msg.(error); ok {
		log.zap.Errorw("error", "error", err, "stack", getStackTrace())
	} else {
		log.zap.Errorw("error", "message", msg, "stack", getStackTrace())
	}
}

func (log *log) Fatal(msg any) {
	if err, ok := msg.(error); ok {
		log.zap.Fatalw("error", "error", err, "stack", getStackTrace())
	} else {
		log.zap.Fatalw("message", "message", msg, "stack", getStackTrace())
	}
}

func (log *log) Warn(msg any) {
	log.zap.Warn(msg)
}

func (log *log) Info(msg any) {
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
	if override := os.Getenv("APP_LOG_PATH"); override != "" {
		return override
	}

	defaultPath := "data/logs"

	var logPath string

	appName := cfg.App.Name

	if cfg.App.Env == config.EnvironmentDocker {
		return defaultPath
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		return defaultPath
	}

	switch runtime.GOOS {
	case "windows":
		appData := os.Getenv("APPDATA")
		if appData == "" {
			return defaultPath
		}

		logPath = filepath.Join(appData, appName, "logs")
	case "darwin":
		logPath = filepath.Join(homeDir, "Library", "Application Support", appName, "logs")
	case "linux":
		logPath = filepath.Join(homeDir, "."+appName, "logs")
	default:
		return defaultPath
	}

	return logPath
}
