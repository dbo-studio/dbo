package databaseGeneric

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
)

const importChunk = 500

// importWithoutTransactions inserts each chunk as one multi-row INSERT. A single INSERT is atomic in
// ClickHouse (one block), so a bad row fails its whole chunk instead of leaving part of it behind.
func (r *Repository) importWithoutTransactions(ctx context.Context, job dto.ImportJob, rows [][]string, columns []string) (*contract.ImportResult, error) {
	start := time.Now()
	columnList := strings.Join(lo.Map(columns, func(c string, _ int) string { return r.d.Quote(c) }), ", ")
	tuple := "(" + strings.TrimSuffix(strings.Repeat("?, ", len(columns)), ", ") + ")"
	table := r.d.Quote(job.Table)

	for from := 0; from < len(rows); from += importChunk {
		chunk := rows[from:min(from+importChunk, len(rows))]
		args := make([]any, 0, len(chunk)*len(columns))

		for _, row := range chunk {
			for _, value := range row {
				args = append(args, importArg(value))
			}
		}

		query := fmt.Sprintf("INSERT INTO %s (%s) VALUES %s", table, columnList, strings.TrimSuffix(strings.Repeat(tuple+", ", len(chunk)), ", "))
		if err := r.base.DB().WithContext(ctx).Exec(query, args...).Error; err != nil {
			return nil, fmt.Errorf("import failed in rows %d-%d: %w", from, from+len(chunk)-1, err)
		}
	}

	return &contract.ImportResult{
		TotalRows:   len(rows),
		SuccessRows: len(rows),
		Duration:    time.Since(start),
		Metadata:    map[string]any{"format": job.Format, "tableName": job.Table},
	}, nil
}

// importArg turns a SQL-literal-shaped cell (NULL, 'quoted', or a bare token) into a bind argument.
func importArg(value string) any {
	if value == "NULL" {
		return nil
	}

	if len(value) >= 2 && value[0] == '\'' && value[len(value)-1] == '\'' {
		return strings.ReplaceAll(value[1:len(value)-1], "''", "'")
	}

	return value
}
