package helper

import (
	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"

	"github.com/goccy/go-json"
)

func ConvertToDTO[T any](params []byte) (T, error) {
	var dtoParams T
	err := json.Unmarshal(params, &dtoParams)
	if err != nil {
		return dtoParams, fmt.Errorf("failed to unmarshal params: %v", err)
	}

	return dtoParams, nil
}

func CommandResponseBuilder(queryResult *dto.RawQueryResponse, endTime time.Duration, err error) *dto.RawQueryResponse {
	message := "OK"
	if err != nil {
		message = err.Error()
	}

	newStructures := []dto.Column{
		{
			Name:       "Query",
			Type:       "Varchar",
			MappedType: "string",
			NotNull:    false,
			Length:     nil,
			Default:    nil,
			IsActive:   true,
		},
		{
			Name:       "Message",
			Type:       "Varchar",
			MappedType: "string",
			NotNull:    false,
			Length:     nil,
			Default:    nil,
			IsActive:   true,
		},
		{
			Name:       "Duration",
			Type:       "Varchar",
			MappedType: "string",
			NotNull:    false,
			Length:     nil,
			Default:    nil,
			IsActive:   true,
		},
	}

	return &dto.RawQueryResponse{
		Query: queryResult.Query,
		Data: []map[string]any{
			{
				"Query":    queryResult.Query,
				"Message":  message,
				"Duration": FloatToString(endTime.Seconds()),
			},
		},
		Columns: newStructures,
	}
}

func IsQuery(query string) bool {
	return strings.Contains(strings.ToLower(query), "select")
}
