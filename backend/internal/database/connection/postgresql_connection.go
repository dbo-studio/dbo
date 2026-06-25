package databaseConnection

import (
	"errors"
	"fmt"
	"strconv"

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

	return string(params), nil
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
	}

	return helper.StructToJSON(params)
}

func OpenPostgresqlConnection(connection *model.Connection) gorm.Dialector {
	options, err := helper.RawJSONToStruct[dto.PostgresqlCreateConnectionParams](json.RawMessage(connection.Options))
	if err != nil {
		return nil
	}

	if options.URI != nil && *options.URI != "" {
		return postgres.Open(*options.URI)
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s ",
		options.Host,
		strconv.Itoa(int(options.Port)),
		options.Username,
	)

	if options.Database != nil && len(lo.FromPtr(options.Database)) > 0 {
		dsn += fmt.Sprintf("dbname=%s ", lo.FromPtr(options.Database))
	}

	if options.Password != nil && len(lo.FromPtr(options.Password)) > 0 {
		dsn += fmt.Sprintf("password=%s", lo.FromPtr(options.Password))
	}

	return postgres.New(postgres.Config{
		DSN: dsn,
	})
}

func (req PgsqlCreateParams) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Host, validation.When(req.URI == nil && *req.URI == "", validation.Required), validation.Length(0, 120)),
		validation.Field(&req.Username, validation.When(req.URI == nil && *req.URI == "", validation.Required), validation.Length(0, 120)),
		validation.Field(&req.Password, validation.Length(0, 120)),
		validation.Field(&req.Port, validation.When(req.URI == nil && *req.URI == "", validation.Required), validation.Min(0)),
		validation.Field(&req.URI, validation.Length(0, 120)),
	)
}

func (req PgsqlUpdateParams) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Host, validation.Length(0, 120)),
		validation.Field(&req.Username, validation.Length(0, 120)),
		validation.Field(&req.Password, validation.Length(0, 120)),
		validation.Field(&req.Port, validation.Min(0)),
		validation.Field(&req.URI, validation.Length(0, 120)),
	)
}
