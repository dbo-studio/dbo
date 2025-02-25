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
	options, err := helper.RawJsonToStruct[PgsqlCreateParams](params)
	if err != nil {
		return "", apperror.Validation(errors.New("invalid params"))
	}

	if err := options.Validate(); err != nil {
		return "", apperror.Validation(err)
	}

	return string(params), nil
}

func UpdatePostgresqlConnection(oldParams json.RawMessage, newParams json.RawMessage) (string, error) {
	oldOptions, err := helper.RawJsonToStruct[PgsqlUpdateParams](oldParams)
	if err != nil {
		return "", apperror.Validation(errors.New("invalid params"))
	}

	newOptions, err := helper.RawJsonToStruct[PgsqlUpdateParams](newParams)
	if err != nil {
		return "", apperror.Validation(errors.New("invalid params"))
	}

§§	if err := newOptions.Validate(); err != nil {
		return "", apperror.Validation(err)
	}

	newOptions.Host = helper.Optional[string](newOptions.Host, oldOptions.Host)
	newOptions.Username = helper.Optional[string](newOptions.Username, oldOptions.Username)
	newOptions.Password = helper.Optional[string](newOptions.Password, oldOptions.Password)
	newOptions.Port = helper.Optional[int32](newOptions.Port, oldOptions.Port)
	newOptions.Database = helper.Optional[string](newOptions.Database, oldOptions.Database)

	return helper.StructToJson(newOptions), nil
}

func OpenPostgresqlConnection(connection *model.Connection) gorm.Dialector {
	options, err := helper.RawJsonToStruct[dto.PostgresqlCreateConnectionParams](json.RawMessage(connection.Options))
	if err != nil {
		return nil
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
		validation.Field(&req.Host, validation.Required, validation.Length(0, 120)),
		validation.Field(&req.Username, validation.Required, validation.Length(0, 120)),
		validation.Field(&req.Password, validation.Length(0, 120)),
		validation.Field(&req.Port, validation.Required, validation.Min(0)),
	)
}

func (ccr PgsqlUpdateParams) Validate() error {
	return validation.ValidateStruct(&ccr,
		validation.Field(&ccr.Host, validation.Length(0, 120)),
		validation.Field(&ccr.Username, validation.Length(0, 120)),
		validation.Field(&ccr.Password, validation.Length(0, 120)),
		validation.Field(&ccr.Port, validation.Min(0)),
	)
}
