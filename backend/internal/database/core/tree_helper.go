package databaseCore

import (
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (*BaseRepository) CommandResponseBuilder(queryResult *dto.RawQueryResponse, endTime time.Duration, err error) *dto.RawQueryResponse {
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
				"Duration": helper.FloatToString(endTime.Seconds()),
			},
		},
		Columns: newStructures,
	}
}

func (*BaseRepository) IsQuery(query string) bool {
	return strings.Contains(strings.ToLower(query), "select")
}
