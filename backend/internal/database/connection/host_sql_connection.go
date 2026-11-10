package databaseConnection

import (
	"net"
	"net/url"
	"strconv"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
	"gorm.io/driver/sqlserver"
	"gorm.io/gorm"

	clickhouseDriver "gorm.io/driver/clickhouse"
)

func hostSQLOptions(connection *model.Connection) (dto.MysqlCreateConnectionParams, bool) {
	options, err := helper.RawJSONToStruct[dto.MysqlCreateConnectionParams](json.RawMessage(connection.Options))

	return options, err == nil
}

// sslMode folds the shared SSL modes into: encrypted or not, and whether the certificate chain is verified.
func sslMode(ssl *dto.ConnectionSSLParams) (encrypt, verify bool) {
	switch dto.NormalizeSSLMode(lo.FromPtr(ssl).Mode) {
	case dto.SSLModeDisable:
		return false, false
	case dto.SSLModeVerifyCA, dto.SSLModeVerifyFull:
		return true, true
	default:
		return true, false
	}
}

// OpenSQLServerConnection builds the go-mssqldb URL DSN. Credentials go through url.UserPassword,
// so a password with special characters cannot inject DSN keys.
func OpenSQLServerConnection(connection *model.Connection) gorm.Dialector {
	options, ok := hostSQLOptions(connection)
	if !ok {
		return nil
	}

	encrypt, verify := sslMode(options.SSL)
	query := url.Values{}
	query.Set("database", lo.FromPtr(options.Database))
	query.Set("encrypt", strconv.FormatBool(encrypt))
	query.Set("TrustServerCertificate", strconv.FormatBool(!verify))
	query.Set("app name", "DBO Studio")

	dsn := url.URL{
		Scheme:   "sqlserver",
		User:     url.UserPassword(options.Username, lo.FromPtr(options.Password)),
		Host:     net.JoinHostPort(options.Host, strconv.Itoa(int(options.Port))),
		RawQuery: query.Encode(),
	}

	return sqlserver.Open(dsn.String())
}

// OpenClickHouseConnection dials the native protocol (default port 9000, 9440 for TLS).
func OpenClickHouseConnection(connection *model.Connection) gorm.Dialector {
	options, ok := hostSQLOptions(connection)
	if !ok {
		return nil
	}

	// The native protocol cannot negotiate TLS, so only an explicit require/verify mode turns it on.
	mode := dto.NormalizeSSLMode(lo.FromPtr(options.SSL).Mode)
	encrypt, verify := sslMode(options.SSL)
	query := url.Values{}
	query.Set("dial_timeout", "10s")

	if encrypt && mode != dto.SSLModePrefer && mode != dto.SSLModeAllow {
		query.Set("secure", "true")
		query.Set("skip_verify", strconv.FormatBool(!verify))
	}

	dsn := url.URL{
		Scheme:   "clickhouse",
		User:     url.UserPassword(options.Username, lo.FromPtr(options.Password)),
		Host:     net.JoinHostPort(options.Host, strconv.Itoa(int(options.Port))),
		Path:     "/" + lo.FromPtr(options.Database),
		RawQuery: query.Encode(),
	}

	return clickhouseDriver.Open(dsn.String())
}
