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
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type MysqlCreateParams dto.MysqlCreateConnectionParams
type MysqlUpdateParams dto.MysqlUpdateConnectionParams

func CreateMysqlConnection(params json.RawMessage) (string, error) {
	options, err := helper.RawJsonToStruct[MysqlCreateParams](params)
	if err != nil {
		return "", apperror.Validation(errors.New("invalid params"))
	}

	if err := options.Validate(); err != nil {
		return "", apperror.Validation(err)
	}

	return string(params), nil
}

func UpdateMysqlConnection(oldParams json.RawMessage, newParams json.RawMessage) (string, error) {
	oldOptions, err := helper.RawJsonToStruct[MysqlUpdateParams](oldParams)
	if err != nil {
		return "", apperror.Validation(errors.New("invalid params"))
	}

	newOptions, err := helper.RawJsonToStruct[PgsqlUpdateParams](newParams)
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
	newOptions.Database = helper.OptionalAndEmpty(newOptions.Database, oldOptions.Database)
	newOptions.URI = helper.OptionalAndEmpty(newOptions.URI, oldOptions.URI)

	return helper.StructToJson(newOptions), nil
}

func OpenMysqlConnection(connection *model.Connection) gorm.Dialector {
	options, err := helper.RawJsonToStruct[dto.MysqlCreateConnectionParams](json.RawMessage(connection.Options))
	if err != nil {
		return nil
	}

	if options.URI != nil && *options.URI != "" {
		return mysql.Open(*options.URI)
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8&parseTime=True&loc=Local",
		options.Username,
		lo.FromPtr(options.Password),
		options.Host,
		strconv.Itoa(int(options.Port)),
		lo.FromPtr(options.Database),
	)

	return mysql.New(mysql.Config{
		DSN: dsn,
	})
}

func (req MysqlCreateParams) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Host, validation.When(lo.FromPtr(req.URI) == "", validation.Required), validation.Length(0, 120)),
		validation.Field(&req.Username, validation.When(lo.FromPtr(req.URI) == "", validation.Required), validation.Length(0, 120)),
		validation.Field(&req.Port, validation.When(lo.FromPtr(req.URI) == "", validation.Required), validation.Min(0)),
		validation.Field(&req.Database, validation.Length(0, 120)),
		validation.Field(&req.Password, validation.Length(0, 120)),
		validation.Field(&req.URI, validation.Length(0, 120)),
	)
}

func (req MysqlUpdateParams) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Host, validation.Length(0, 120)),
		validation.Field(&req.Username, validation.Length(0, 120)),
		validation.Field(&req.Password, validation.Length(0, 120)),
		validation.Field(&req.Port, validation.Min(0)),
		validation.Field(&req.URI, validation.Length(0, 120)),
	)
}
