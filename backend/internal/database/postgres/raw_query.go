package databasePostgres

import (
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *PostgresRepository) RunRawQuery(req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	result, err := runRawQuery(r, req)
	if err != nil || !result.IsQuery {
		return commandResponseBuilder(result, err), nil
	}

	return result, nil
}

func runRawQuery(r *PostgresRepository, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	startTime := time.Now()
	queryResults := make([]map[string]interface{}, 0)

	rows, err := r.db.Raw(req.Query).Rows()
	if err != nil {
		return &dto.RawQueryResponse{
			Query:    req.Query,
			Data:     queryResults,
			IsQuery:  isQuery(req.Query),
			Duration: "0",
		}, err
	}

	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	columnTypes, err := rows.ColumnTypes()
	if err != nil {
		return nil, err
	}

	for rows.Next() {
		var data map[string]interface{}
		err := r.db.ScanRows(rows, &data)
		if err != nil {
			return nil, err
		}
		queryResults = append(queryResults, data)
	}

	endTime := time.Since(startTime)

	for i := range queryResults {
		queryResults[i]["dbo_index"] = i
		queryResults[i]["editable"] = false
	}

	structures := make([]dto.Column, 0)

	for i, column := range columns {
		structures = append(structures, dto.Column{
			Name:       column,
			Type:       strings.ToLower(columnTypes[i].DatabaseTypeName()),
			MappedType: columnMappedFormat(columnTypes[i].Name()),
			IsActive:   true,
		})
	}

	//p.DBLogger(req.Query)

	return &dto.RawQueryResponse{
		Query:    req.Query,
		Data:     queryResults,
		Columns:  structures,
		IsQuery:  isQuery(req.Query),
		Duration: helper.FloatToString(endTime.Seconds()),
	}, nil
}

func commandResponseBuilder(queryResult *dto.RawQueryResponse, err error) *dto.RawQueryResponse {
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
			Name:       "Time",
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
		Data: []map[string]interface{}{
			{
				"Query":    queryResult.Query,
				"Message":  message,
				"Duration": queryResult.Duration,
			},
		},
		Columns: newStructures,
	}
}
