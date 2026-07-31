package databaseConnection

import (
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/goccy/go-json"
	"github.com/invopop/validation"
	"github.com/samber/lo"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type PgsqlCreateParams dto.PostgresqlCreateConnectionParams
type PgsqlUpdateParams dto.PostgresqlUpdateConnectionParams

func CreatePostgresqlConnection(params json.RawMessage) (string, error) {
	options, err := helper.RawJSONToStruct[PgsqlCreateParams](params)
	if err != nil {
		return "", apperror.Validation(errors.New("invalid params"))
	}

	if err := options.Validate(); err != nil {
		return "", apperror.Validation(err)
	}

	if options.SSL != nil {
		options.SSL.Mode = dto.NormalizeSSLMode(options.SSL.Mode)
	}

	return helper.StructToJSON(options), nil
}

func UpdatePostgresqlConnection(oldParams json.RawMessage, newParams json.RawMessage) (string, error) {
	oldOptions, err := helper.RawJSONToStruct[PgsqlUpdateParams](oldParams)
	if err != nil {
		return "", apperror.Validation(errors.New("invalid params"))
	}

	newOptions, err := helper.RawJSONToStruct[PgsqlUpdateParams](newParams)
	if err != nil {
		return "", apperror.Validation(errors.New("invalid params"))
	}

	if err := newOptions.Validate(); err != nil {
		return "", apperror.Validation(err)
	}

	newOptions.Host = helper.OptionalAndEmpty(newOptions.Host, oldOptions.Host)
	newOptions.Username = helper.OptionalAndEmpty(newOptions.Username, oldOptions.Username)
	newOptions.Password = helper.OptionalAndEmpty(newOptions.Password, oldOptions.Password)
	newOptions.Port = helper.OptionalAndEmpty(newOptions.Port, oldOptions.Port)
	newOptions.Database = helper.OptionalOrKeep(newOptions.Database, oldOptions.Database)
	newOptions.URI = helper.OptionalOrKeep(newOptions.URI, oldOptions.URI)
	newOptions.SSL = mergeSSLParams(newOptions.SSL, oldOptions.SSL)

	return pgsqlUpdateParamsToCreateJSON(newOptions), nil
}

func pgsqlUpdateParamsToCreateJSON(opts PgsqlUpdateParams) string {
	params := dto.PostgresqlCreateConnectionParams{
		Host:     lo.FromPtrOr(opts.Host, ""),
		Port:     lo.FromPtrOr(opts.Port, 0),
		Username: lo.FromPtrOr(opts.Username, ""),
		Password: opts.Password,
		Database: opts.Database,
		URI:      opts.URI,
		SSL:      opts.SSL,
	}

	return helper.StructToJSON(params)
}

func OpenPostgresqlConnection(connection *model.Connection) gorm.Dialector {
	return openPostgresqlConnection(connection, "")
}

func OpenPostgresqlConnectionForDatabase(connection *model.Connection, databaseName string) gorm.Dialector {
	return openPostgresqlConnection(connection, databaseName)
}

func DefaultPostgresqlDatabase(connection *model.Connection) string {
	options, err := helper.RawJSONToStruct[dto.PostgresqlCreateConnectionParams](json.RawMessage(connection.Options))
	if err != nil {
		return ""
	}

	if options.URI != nil && *options.URI != "" {
		parsed, err := url.Parse(*options.URI)
		if err != nil {
			return ""
		}
		return strings.TrimPrefix(parsed.Path, "/")
	}

	return lo.FromPtr(options.Database)
}

func openPostgresqlConnection(connection *model.Connection, databaseName string) gorm.Dialector {
	options, err := helper.RawJSONToStruct[dto.PostgresqlCreateConnectionParams](json.RawMessage(connection.Options))
	if err != nil {
		return nil
	}

	if options.URI != nil && *options.URI != "" {
		uri := *options.URI
		if databaseName != "" {
			uri = overridePostgresqlURIDatabase(uri, databaseName)
		}
		uri = appendPostgresqlURISSL(uri, options.SSL)
		return postgres.Open(uri)
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s ",
		options.Host,
		strconv.Itoa(int(options.Port)),
		options.Username,
	)

	dbName := lo.FromPtr(options.Database)
	if databaseName != "" {
		dbName = databaseName
	}
	if dbName != "" {
		dsn += fmt.Sprintf("dbname=%s ", dbName)
	}

	if options.Password != nil && len(lo.FromPtr(options.Password)) > 0 {
		dsn += fmt.Sprintf("password=%s ", lo.FromPtr(options.Password))
	}

	dsn = appendPostgresqlSSLDSN(dsn, options.SSL)

	return postgres.New(postgres.Config{
		DSN: dsn,
	})
}

func overridePostgresqlURIDatabase(uri, databaseName string) string {
	parsed, err := url.Parse(uri)
	if err != nil {
		return uri
	}
	parsed.Path = "/" + databaseName
	return parsed.String()
}

func (req PgsqlCreateParams) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Host, validation.When(lo.FromPtr(req.URI) == "", validation.Required), validation.Length(0, 120)),
		validation.Field(&req.Username, validation.When(lo.FromPtr(req.URI) == "", validation.Required), validation.Length(0, 120)),
		validation.Field(&req.Password, validation.Length(0, 120)),
		validation.Field(&req.Port, validation.When(lo.FromPtr(req.URI) == "", validation.Required), validation.Min(0)),
		validation.Field(&req.URI, validation.Length(0, 2048)),
		validation.Field(&req.SSL),
	)
}

func (req PgsqlUpdateParams) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Host, validation.Length(0, 120)),
		validation.Field(&req.Username, validation.Length(0, 120)),
		validation.Field(&req.Password, validation.Length(0, 120)),
		validation.Field(&req.Port, validation.Min(0)),
		validation.Field(&req.URI, validation.Length(0, 2048)),
		validation.Field(&req.SSL),
	)
}
