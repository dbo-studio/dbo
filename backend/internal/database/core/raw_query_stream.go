package databaseCore

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

// StreamRawQuery runs a read query and hands rows to fn in chunks, with no row
// cap. Callers (export) must not buffer more than one chunk.
func (r *BaseRepository) StreamRawQuery(ctx context.Context, req *dto.RawQueryRequest, chunkSize int, fn func(columns []dto.Column, rows []map[string]any) error) error {
	db := r.db

	if database := strings.TrimSpace(lo.FromPtr(req.Database)); database != "" {
		scoped, err := r.DBForDatabase(ctx, database)
		if err != nil {
			return err
		}

		db = scoped
	}

	return r.StreamRawQueryOn(ctx, db, req.Query, chunkSize, fn)
}

func (r *BaseRepository) StreamRawQueryOn(ctx context.Context, db *gorm.DB, query string, chunkSize int, fn func(columns []dto.Column, rows []map[string]any) error) error {
	if chunkSize <= 0 {
		chunkSize = 1000
	}

	rows, err := db.WithContext(ctx).Raw(query).Rows()
	if err != nil {
		return err
	}

	defer func(rows *sql.Rows) {
		if err := rows.Close(); err != nil {
			r.Logger().Error(fmt.Errorf("failed to close rows: %w", err))
		}
	}(rows)

	columnNames, err := rows.Columns()
	if err != nil {
		return err
	}

	columnTypes, err := rows.ColumnTypes()
	if err != nil {
		return err
	}

	columns, mappedTypes := r.columnStructures(columnNames, columnTypes)
	chunk := make([]map[string]any, 0, chunkSize)

	flush := func() error {
		if len(chunk) == 0 {
			return nil
		}

		for i := range chunk {
			chunk[i] = SanitizeQueryResultsWithTypes(chunk[i], mappedTypes)
		}

		err := fn(columns, chunk)
		chunk = make([]map[string]any, 0, chunkSize)

		return err
	}

	for rows.Next() {
		if err := ctx.Err(); err != nil {
			return err
		}

		var data map[string]any
		if err := db.WithContext(ctx).ScanRows(rows, &data); err != nil {
			return err
		}

		chunk = append(chunk, data)

		if len(chunk) >= chunkSize {
			if err := flush(); err != nil {
				return err
			}
		}
	}

	if err := rows.Err(); err != nil {
		return err
	}

	// Empty tables still need one call so callers learn the columns.
	if len(chunk) == 0 {
		return fn(columns, nil)
	}

	return flush()
}
