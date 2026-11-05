package databaseConnection

import (
	"errors"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/goccy/go-json"
)

func CreateRedisConnection(params json.RawMessage) (string, error) {
	options, err := helper.RawJSONToStruct[dto.RedisConnectionParams](params)
	if err != nil {
		return "", apperror.Validation(errors.New("invalid params"))
	}

	if err := options.Validate(); err != nil {
		return "", apperror.Validation(err)
	}

	return helper.StructToJSON(options), nil
}

// UpdateRedisConnection overlays the keys present in newParams on the stored options.
func UpdateRedisConnection(oldParams json.RawMessage, newParams json.RawMessage) (string, error) {
	merged := map[string]json.RawMessage{}

	for _, raw := range []json.RawMessage{oldParams, newParams} {
		if len(raw) == 0 {
			continue
		}

		var part map[string]json.RawMessage
		if err := json.Unmarshal(raw, &part); err != nil {
			return "", apperror.Validation(errors.New("invalid params"))
		}

		for k, v := range part {
			merged[k] = v
		}
	}

	out, err := json.Marshal(merged)
	if err != nil {
		return "", apperror.Validation(errors.New("invalid params"))
	}

	return CreateRedisConnection(out)
}
