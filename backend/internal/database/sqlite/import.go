package databaseSqlite

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *SQLiteRepository) ImportData(ctx context.Context, job dto.ImportJob, rows [][]string, columns []string) (*contract.ImportResult, error) {
	startTime := time.Now()
	var errors []contract.ImportError
	successRows := 0
	failedRows := 0

	for _, row := range rows {
		for i, value := range row {
			row[i] = helper.FormatSQLValue(value)
		}
	}

	for i, row := range rows {
		insertQuery := fmt.Sprintf(`INSERT INTO "%s" (%s) VALUES (%s)`,
			job.Table,
			strings.Join(columns, ", "),
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
		Metadata: map[string]interface{}{
			"format":    job.Format,
			"tableName": job.Table,
		},
	}, nil
}
