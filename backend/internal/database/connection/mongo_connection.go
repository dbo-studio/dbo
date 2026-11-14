package databaseConnection

import (
	"errors"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/goccy/go-json"
)

func CreateMongoConnection(params json.RawMessage) (string, error) {
	options, err := helper.RawJSONToStruct[dto.MongoConnectionParams](params)
	if err != nil {
		return "", apperror.Validation(errors.New("invalid params"))
	}

	if err := options.Validate(); err != nil {
		return "", apperror.Validation(err)
	}

	dto.NormalizeSSH(options.SSH)

	if err := dto.ValidateSSHSecrets(options.SSH); err != nil {
		return "", apperror.Validation(err)
	}

	return helper.StructToJSON(options), nil
}

// UpdateMongoConnection overlays the keys present in newParams on the stored options.
func UpdateMongoConnection(oldParams json.RawMessage, newParams json.RawMessage) (string, error) {
	merged, err := overlayOptions(oldParams, newParams)
	if err != nil {
		return "", err
	}

	return CreateMongoConnection(merged)
}
