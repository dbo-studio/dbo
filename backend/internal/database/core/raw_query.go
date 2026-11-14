package databaseCore

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/sqlguard"
	"github.com/dbo-studio/dbo/pkg/txsession"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

func (r *BaseRepository) RunRawQuery(ctx context.Context, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	db := r.db
	database := strings.TrimSpace(lo.FromPtr(req.Database))

	if database != "" {
		scoped, err := r.DBForDatabase(ctx, database)
		if err != nil {
			if isContextCancelErr(ctx, err) {
				return nil, apperror.QueryCanceled()
			}

			return r.CommandResponseBuilder(&dto.RawQueryResponse{Query: req.Query}, 0, err), nil
		}

		db = scoped
	}

	return r.RunRawQueryOn(ctx, db, req)
}

func (r *BaseRepository) RunRawQueryOn(ctx context.Context, db *gorm.DB, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	if tx := txsession.FromCtx(ctx); tx != nil {
		db = tx
	}

	startTime := time.Now()
	result, err := runRawScript(ctx, r, db, req)
	endTime := time.Since(startTime)

	if err != nil {
		if isContextCancelErr(ctx, err) {
			return nil, apperror.QueryCanceled()
		}

		return r.CommandResponseBuilder(result, endTime, err), nil
	}

	if !r.IsQuery(req.Query) {
		return r.CommandResponseBuilder(result, endTime, nil), nil
	}

	return result, nil
}

func isContextCancelErr(ctx context.Context, err error) bool {
	if err == nil {
		return false
	}

	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return true
	}

	if ctx.Err() != nil {
		return true
	}

	return false
}

// openRows runs the statement. With bound arguments it goes to the driver as it is, with the engine's own
// placeholders: gorm's Raw would rewrite every ? in the text, quoted or not.
func openRows(ctx context.Context, db *gorm.DB, req *dto.RawQueryRequest) (*sql.Rows, error) {
	if len(req.Args) == 0 {
		return db.WithContext(ctx).Raw(req.Query).Rows()
	}

	return db.WithContext(ctx).Statement.ConnPool.QueryContext(ctx, req.Query, req.Args...)
}

// runRawScript runs a multi-statement script one statement at a time on a single pinned connection, so
// BEGIN/COMMIT hold and the prepared-statement one-command limit does not apply. The last statement's
// result is returned. A single statement, or one with bound args, goes straight to runRawQuery. Inside a
// tab's open transaction (ctx carries it) the statements run on that transaction.
func runRawScript(ctx context.Context, r *BaseRepository, db *gorm.DB, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	statements := sqlguard.Split(req.Query)
	if len(req.Args) > 0 || len(statements) < 2 {
		return runRawQuery(ctx, r, db, req)
	}

	inTx := txsession.FromCtx(ctx) != nil

	var result *dto.RawQueryResponse

	scope := db.WithContext(ctx).Connection
	if inTx {
		scope = func(fc func(tx *gorm.DB) error) error { return fc(db) }
	}

	err := scope(func(conn *gorm.DB) error {
		for i, statement := range statements[:len(statements)-1] {
			if err := conn.Exec(statement).Error; err != nil {
				if !inTx {
					// Leave no aborted transaction on the pooled connection.
					_ = conn.Exec("ROLLBACK").Error
				}

				return fmt.Errorf("statement %d of %d: %w", i+1, len(statements), err)
			}
		}

		last := *req
		last.Query = statements[len(statements)-1]

		var err error

		result, err = runRawQuery(ctx, r, conn, &last)
		if err != nil {
			if !inTx {
				_ = conn.Exec("ROLLBACK").Error
			}

			return fmt.Errorf("statement %d of %d: %w", len(statements), len(statements), err)
		}

		return nil
	})
	if result == nil {
		result = &dto.RawQueryResponse{Data: []map[string]any{}}
	}

	result.Query = req.Query

	return result, err
}

func runRawQuery(ctx context.Context, r *BaseRepository, db *gorm.DB, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	queryResults := make([]map[string]any, 0)

	limit, _ := sqlguard.ResolveLimitPage(req.Limit, req.Page)

	rows, err := openRows(ctx, db, req)
	if err != nil {
		return &dto.RawQueryResponse{
			Query: req.Query,
			Data:  queryResults,
			Limit: limit,
			Page:  lo.FromPtrOr(req.Page, 1),
		}, err
	}

	defer func(rows *sql.Rows) {
		if err := rows.Close(); err != nil {
			r.Logger().Error(fmt.Errorf("failed to close rows: %w", err))
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
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		var data map[string]any

		err := db.WithContext(ctx).ScanRows(rows, &data)
		if err != nil {
			return nil, err
		}

		queryResults = append(queryResults, data)

		if len(queryResults) >= limit {
			break
		}
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	structures, columnMappedTypes := r.columnStructures(columns, columnTypes)

	for i := range queryResults {
		queryResults[i]["dbo_index"] = i
		queryResults[i]["editable"] = false
		queryResults[i] = SanitizeQueryResultsWithTypes(queryResults[i], columnMappedTypes)
	}

	page := 1
	if req.Page != nil && *req.Page > 0 {
		page = *req.Page
	}

	return &dto.RawQueryResponse{
		Query:   req.Query,
		Data:    queryResults,
		Columns: structures,
		Limit:   limit,
		Page:    page,
	}, nil
}

func (r *BaseRepository) columnStructures(columns []string, columnTypes []*sql.ColumnType) ([]dto.Column, map[string]string) {
	structures := make([]dto.Column, 0, len(columns))
	columnMappedTypes := make(map[string]string, len(columns))

	for i, column := range columns {
		dbType := columnTypes[i].DatabaseTypeName()

		mappedType := r.ColumnMappedFormat(dbType)
		if length, ok := columnTypes[i].Length(); ok && strings.EqualFold(dbType, "TINYINT") && length == 1 {
			mappedType = MappedTypeBoolean
		}

		columnMappedTypes[column] = mappedType
		structures = append(structures, dto.Column{
			Name:       column,
			Type:       strings.ToLower(dbType),
			MappedType: mappedType,
			IsActive:   true,
		})
	}

	return structures, columnMappedTypes
}
