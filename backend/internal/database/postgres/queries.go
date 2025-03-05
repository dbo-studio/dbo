package databasePostgres

import (
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func runQuery(r *PostgresRepository, req *dto.RunQueryRequest) (*dto.RunQueryResponse, error) {
	node := extractNode(req.NodeId)
	query := queryGenerator(req, node)
	queryResults := make([]map[string]interface{}, 0)

	result := r.db.Raw(query).Find(&queryResults)
	if result.Error != nil {
		return nil, result.Error
	}

	for i := range queryResults {
		queryResults[i]["dbo_index"] = i
	}

	columns, err := r.getColumns(node.Table, node.Schema, req.Columns, true)
	if err != nil {
		return nil, result.Error
	}

	//p.DBLogger(query)

	return &dto.RunQueryResponse{
		Query:      query,
		Structures: columnListToResponse(columns),
		Data:       queryResults,
	}, nil
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

	structures := make([]dto.Structure, 0)

	for i, column := range columns {
		structures = append(structures, dto.Structure{
			ColumnName: column,
			DataType:   strings.ToLower(columnTypes[i].DatabaseTypeName()),
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
