package databaseSqlite

import (
	"database/sql"
	"log"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *SQLiteRepository) RunRawQuery(req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	startTime := time.Now()
	result, err := runRawQuery(r, req)
	endTime := time.Since(startTime)
	if err != nil || !helper.IsQuery(req.Query) {
		return helper.CommandResponseBuilder(result, endTime, err), nil
	}

	return result, nil
}

func runRawQuery(r *SQLiteRepository, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	queryResults := make([]map[string]any, 0)

	rows, err := r.db.Raw(req.Query).Rows()
	if err != nil {
		return &dto.RawQueryResponse{
			Query: req.Query,
			Data:  queryResults,
		}, err
	}

	defer func(rows *sql.Rows) {
		err := rows.Close()
		if err != nil {
			log.Printf("Error closing rows: %v", err)
		}
	}(rows)

	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	columnTypes, err := rows.ColumnTypes()
	if err != nil {
		return nil, err
	}

	for rows.Next() {
		var data map[string]any
		err := r.db.ScanRows(rows, &data)
		if err != nil {
			return nil, err
		}
		queryResults = append(queryResults, data)
	}

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

	return &dto.RawQueryResponse{
		Query:   req.Query,
		Data:    queryResults,
		Columns: structures,
	}, nil
}
