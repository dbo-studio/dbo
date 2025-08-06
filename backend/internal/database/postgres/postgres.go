package databasePostgres

import (
	"fmt"
	"strings"
	"time"

	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

type PostgresRepository struct {
	db         *gorm.DB
	connection *model.Connection
}

func NewPostgresRepository(connection *model.Connection, cm *databaseConnection.ConnectionManager) (contract.DatabaseRepository, error) {
	db, err := cm.GetConnection(connection)
	if err != nil {
		return nil, err
	}
	return &PostgresRepository{
		db:         db,
		connection: connection,
	}, nil
}

func (r *PostgresRepository) Version() (string, error) {
	var version string
	result := r.db.Raw("SELECT version()").Scan(&version)
	version = strings.Split(version, " ")[1]

	return version, result.Error
}

func (r *PostgresRepository) ExportData(query string, format string, chunkSize int) (*contract.ExportResult, error) {
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM (%s) as count_query", query)
	var totalRows int
	if err := r.db.Raw(countQuery).Scan(&totalRows).Error; err != nil {
		return nil, fmt.Errorf("failed to get total row count: %w", err)
	}

	exportID := fmt.Sprintf("export_%d", time.Now().Unix())

	return &contract.ExportResult{
		ExportID:  exportID,
		Query:     query,
		Format:    format,
		TotalRows: totalRows,
		ChunkSize: chunkSize,
		CreatedAt: time.Now(),
		Status:    "created",
	}, nil
}

func (r *PostgresRepository) GetExportData(query string, offset, limit int) ([]map[string]interface{}, []string, error) {
	limitedQuery := fmt.Sprintf("%s LIMIT %d OFFSET %d", query, limit, offset)

	rows, err := r.db.Raw(limitedQuery).Rows()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to execute query: %w", err)
	}
	defer rows.Close()

	// Get column names
	columns, err := rows.Columns()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get column names: %w", err)
	}

	// Process rows
	var data []map[string]interface{}
	for rows.Next() {
		row := make([]interface{}, len(columns))
		rowPtrs := make([]interface{}, len(columns))
		for i := range row {
			rowPtrs[i] = &row[i]
		}

		if err := rows.Scan(rowPtrs...); err != nil {
			continue
		}

		rowMap := make(map[string]interface{})
		for i, col := range columns {
			rowMap[col] = row[i]
		}
		data = append(data, rowMap)
	}

	return data, columns, nil
}
