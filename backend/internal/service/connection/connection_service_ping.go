package serviceConnection

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

func (s IConnectionServiceImpl) Ping(ctx context.Context, req *dto.PingConnectionRequest) (*dto.PingConnectionResponse, error) {
	ownerID := helper.CtxOwnerID(ctx)

	if req.ID != nil {
		if _, err := s.connectionRepo.Find(ctx, lo.FromPtr(req.ID)); err != nil {
			return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
		}
	}

	if _, err := s.createConnectionDto(&dto.CreateConnectionRequest{
		Type:    req.Type,
		Options: req.Options,
	}); err != nil {
		return nil, apperror.DriverError(err)
	}

	connection := &model.Connection{
		ConnectionType: req.Type,
		Options:        string(req.Options),
	}

	start := time.Now()
	dbConn, err := s.cm.GetConnection(ctx, connection, false)
	latency := time.Since(start).Milliseconds()
	if err != nil {
		return nil, pingDiagnosticError(req.Type, err, latency)
	}

	repo, err := database.NewDatabaseRepository(ctx, connection, s.cm)
	if err != nil {
		_ = s.cm.Close(ctx, ownerID, connection.ID)
		return nil, apperror.DriverError(fmt.Errorf("connection established but repository initialization failed: %w", err))
	}

	version, err := repo.Version(ctx)
	if err != nil {
		_ = s.cm.Close(ctx, ownerID, connection.ID)
		return nil, apperror.DriverError(fmt.Errorf("connection established but version check failed: %w", err))
	}

	sslNegotiated, sslMode := pingSSLDiagnostics(ctx, req, dbConn)

	if err := s.cm.Close(ctx, ownerID, connection.ID); err != nil {
		return nil, err
	}

	return &dto.PingConnectionResponse{
		LatencyMs:     latency,
		ServerVersion: version,
		SSLNegotiated: sslNegotiated,
		SSLMode:       sslMode,
	}, nil
}

func pingSSLDiagnostics(ctx context.Context, req *dto.PingConnectionRequest, db *gorm.DB) (*bool, *string) {
	if req == nil {
		return nil, nil
	}

	switch req.Type {
	case "postgresql":
		mode := sslModeFromPostgresOptions(req.Options)
		if db == nil {
			return nil, mode
		}

		type postgresSSLStatus struct {
			SSL *bool `gorm:"column:ssl"`
		}
		var status postgresSSLStatus
		err := db.WithContext(ctx).Raw("SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()").Scan(&status).Error
		if err != nil || status.SSL == nil {
			return nil, mode
		}

		return status.SSL, mode
	case "mysql":
		mode := sslModeFromMysqlOptions(req.Options)
		if db == nil {
			return nil, mode
		}

		type mysqlSSLStatus struct {
			VariableName string `gorm:"column:Variable_name"`
			Value        string `gorm:"column:Value"`
		}
		var status mysqlSSLStatus
		err := db.WithContext(ctx).Raw("SHOW STATUS LIKE 'Ssl_cipher'").Scan(&status).Error
		if err != nil {
			return nil, mode
		}

		negotiated := strings.TrimSpace(status.Value) != ""
		return lo.ToPtr(negotiated), mode
	default:
		return nil, nil
	}
}

func sslModeFromPostgresOptions(raw json.RawMessage) *string {
	options, err := helper.RawJSONToStruct[dto.PostgresqlCreateConnectionParams](raw)
	if err != nil || options.SSL == nil {
		return nil
	}

	mode := dto.NormalizeSSLMode(options.SSL.Mode)
	return lo.ToPtr(mode)
}

func sslModeFromMysqlOptions(raw json.RawMessage) *string {
	options, err := helper.RawJSONToStruct[dto.MysqlCreateConnectionParams](raw)
	if err != nil || options.SSL == nil {
		return nil
	}

	mode := dto.NormalizeSSLMode(options.SSL.Mode)
	return lo.ToPtr(mode)
}

func pingDiagnosticError(connectionType string, err error, latencyMs int64) error {
	category, suggestion := classifyConnectionFailure(err)
	message := fmt.Sprintf("%s: %s", category, suggestion)

	return &apperror.AppError{
		Code:    400,
		Message: "driver_error",
		Err:     errors.New(message),
		Data: map[string]any{
			"category":   category,
			"suggestion": suggestion,
			"latencyMs":  latencyMs,
			"type":       connectionType,
		},
	}
}

func classifyConnectionFailure(err error) (string, string) {
	if err == nil {
		return "unknown", "Retry the test connection."
	}

	msg := strings.ToLower(err.Error())
	switch {
	case strings.Contains(msg, "password authentication failed"),
		strings.Contains(msg, "access denied"),
		strings.Contains(msg, "authentication failed"),
		strings.Contains(msg, "invalid credentials"),
		strings.Contains(msg, "using password: yes"):
		return "authentication", "Check username/password and any password prompt settings."
	case strings.Contains(msg, "timeout"),
		strings.Contains(msg, "i/o timeout"),
		strings.Contains(msg, "connection refused"),
		strings.Contains(msg, "no such host"),
		strings.Contains(msg, "network is unreachable"):
		return "network", "Check host, port, VPN/firewall, and that the database is reachable."
	case strings.Contains(msg, "ssl"),
		strings.Contains(msg, "tls"),
		strings.Contains(msg, "certificate"),
		strings.Contains(msg, "x509"),
		strings.Contains(msg, "handshake"):
		return "ssl", "Check SSL mode and certificates (CA/client cert/client key)."
	default:
		return "unknown", "Verify connection details and retry."
	}
}
