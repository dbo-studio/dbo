package databaseConnection

import (
	"errors"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/goccy/go-json"
	"github.com/invopop/validation"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type SQLiteCreateParams dto.SQLiteCreateConnectionParams
type SQLiteUpdateParams dto.SQLiteUpdateConnectionParams

func CreateSQLiteConnection(params json.RawMessage) (string, error) {
	options, err := helper.RawJsonToStruct[SQLiteCreateParams](params)
	if err != nil {
		return "", apperror.Validation(errors.New("invalid params"))
	}

	if err := options.Validate(); err != nil {
		return "", apperror.Validation(err)
	}

	return string(params), nil
}

func UpdateSQLiteConnection(oldParams json.RawMessage, newParams json.RawMessage) (string, error) {
	oldOptions, err := helper.RawJsonToStruct[SQLiteUpdateParams](oldParams)
	if err != nil {
		return "", apperror.Validation(errors.New("invalid params"))
	}

	newOptions, err := helper.RawJsonToStruct[SQLiteUpdateParams](newParams)
	if err != nil {
		return "", apperror.Validation(errors.New("invalid params"))
	}

	newOptions.Path = helper.Optional[string](newOptions.Path, oldOptions.Path)
	return helper.StructToJson(newOptions), nil
}

func OpenSQLiteConnection(connection *model.Connection) gorm.Dialector {
	options, err := helper.RawJsonToStruct[dto.SQLiteCreateConnectionParams](json.RawMessage(connection.Options))
	if err != nil {
		return nil
	}

	return sqlite.Open(options.Path)
}

func (req SQLiteCreateParams) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Path, validation.Required, validation.Length(0, 120)),
	)
}
