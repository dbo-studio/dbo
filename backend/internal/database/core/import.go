package databaseCore

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *BaseRepository) ImportData(ctx context.Context, job dto.ImportJob, rows [][]string, columns []string) (*contract.ImportResult, error) {
	startTime := time.Now()

	var errors []contract.ImportError

	successRows := 0
	failedRows := 0

	quotedTable := r.quoteIdent(job.Table)
	quotedColumns := make([]string, len(columns))
	for i, col := range columns {
		quotedColumns[i] = r.quoteIdent(col)
	}
	columnList := strings.Join(quotedColumns, ", ")

	for _, row := range rows {
		for i, value := range row {
			row[i] = helper.FormatSQLValue(value)
		}
	}

	for i, row := range rows {
		insertQuery := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)",
			quotedTable,
			columnList,
			strings.Join(row, ", "))

		err := r.db.WithContext(ctx).Exec(insertQuery).Error
		if err != nil {
			failedRows++

			errors = append(errors, contract.ImportError{
				Row:     i,
				Message: err.Error(),
				Value:   strings.Join(row, ", "),
			})

			if !job.ContinueOnError {
				return nil, fmt.Errorf("import failed at row %d: %w", i, err)
			}

			if job.MaxErrors > 0 && len(errors) >= job.MaxErrors {
				return nil, fmt.Errorf("maximum errors reached (%d)", job.MaxErrors)
			}
		} else {
			successRows++
		}
	}

	return &contract.ImportResult{
		TotalRows:   len(rows),
		SuccessRows: successRows,
		FailedRows:  failedRows,
		Errors:      errors,
		Duration:    time.Since(startTime),
		Metadata: map[string]any{
			"format":    job.Format,
			"tableName": job.Table,
		},
	}, nil
}

func (r *BaseRepository) quoteIdent(name string) string {
	switch r.Connection().ConnectionType {
	case string(contract.Mysql):
		return QuoteMySQLIdent(name)
	case string(contract.Sqlite):
		return QuoteSQLiteIdent(name)
	default:
		return QuotePGIdent(name)
	}
}
