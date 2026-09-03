package databaseCore

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"gorm.io/gorm"
)

// importChunkSize bounds each transaction: rows are inserted with bound
// parameters inside a chunk transaction, so an interrupted import never
// leaves a partially written chunk behind.
const importChunkSize = 500

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
	placeholders := strings.TrimSuffix(strings.Repeat("?, ", len(columns)), ", ")
	insertQuery := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)", quotedTable, columnList, placeholders)

	insertRow := func(execer *gorm.DB, row []string) error {
		args := make([]any, len(row))
		for i, value := range row {
			args[i] = importValueToArg(value)
		}

		return execer.Exec(insertQuery, args...).Error
	}

	for chunkStart := 0; chunkStart < len(rows); chunkStart += importChunkSize {
		chunkEnd := min(chunkStart+importChunkSize, len(rows))

		if job.ContinueOnError {
			// Tolerant mode: execute row by row so one bad row doesn't abort
			// the chunk, collecting errors as before.
			for i := chunkStart; i < chunkEnd; i++ {
				if err := insertRow(r.db.WithContext(ctx), rows[i]); err != nil {
					failedRows++

					errors = append(errors, contract.ImportError{
						Row:     i,
						Message: err.Error(),
						Value:   strings.Join(rows[i], ", "),
					})

					if job.MaxErrors > 0 && len(errors) >= job.MaxErrors {
						return nil, fmt.Errorf("maximum errors reached (%d)", job.MaxErrors)
					}
				} else {
					successRows++
				}
			}

			continue
		}

		// Strict mode: the whole chunk is atomic — any failure rolls the
		// chunk back and stops the import.
		err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			for i := chunkStart; i < chunkEnd; i++ {
				if err := insertRow(tx, rows[i]); err != nil {
					return fmt.Errorf("import failed at row %d: %w", i, err)
				}
			}

			return nil
		})
		if err != nil {
			return nil, err
		}

		successRows += chunkEnd - chunkStart
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

// importValueToArg converts a SQL-literal-shaped cell ("NULL", 'quoted', or a
// bare token) into a bind argument, replacing string interpolation entirely.
func importValueToArg(value string) any {
	if value == "NULL" {
		return nil
	}

	if len(value) >= 2 && value[0] == '\'' && value[len(value)-1] == '\'' {
		return strings.ReplaceAll(value[1:len(value)-1], "''", "'")
	}

	return value
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
