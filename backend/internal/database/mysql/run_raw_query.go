package databaseMysql

import (
	"context"
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

type mysqlRawQueryResolver struct {
	repo *MySQLRepository
}

func (r *MySQLRepository) RunRawQuery(ctx context.Context, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	database := strings.TrimSpace(lo.FromPtr(req.Database))
	if database == "" {
		database = databaseConnection.DefaultMysqlDatabase(r.base.Connection())
	}

	if database != "" && lo.FromPtr(req.Database) == "" {
		req.Database = lo.ToPtr(database)
	}

	db, cleanup, err := r.sessionForDatabase(ctx, database)
	if err != nil {
		if ctx.Err() != nil {
			return nil, apperror.QueryCanceled()
		}

		return r.base.CommandResponseBuilder(&dto.RawQueryResponse{Query: req.Query}, 0, err), nil
	}
	defer cleanup()

	resp, err := r.base.RunRawQueryOn(ctx, db, req)
	if err != nil || resp == nil {
		return resp, err
	}

	return databaseCore.EnrichRawQueryResponse(ctx, req, resp, &mysqlRawQueryResolver{repo: r})
}

func (r *MySQLRepository) sessionForDatabase(ctx context.Context, database string) (*gorm.DB, func(), error) {
	if database == "" {
		return r.base.DB(), func() {}, nil
	}

	sqlDB, err := r.base.DB().DB()
	if err != nil {
		return nil, nil, err
	}

	conn, err := sqlDB.Conn(ctx)
	if err != nil {
		return nil, nil, err
	}

	closed := false
	cleanup := func() {
		if closed {
			return
		}

		closed = true
		_ = conn.Close()
	}

	if _, err := conn.ExecContext(ctx, fmt.Sprintf("USE %s", databaseCore.QuoteMySQLIdent(database))); err != nil {
		cleanup()

		return nil, nil, err
	}

	session := r.base.DB().Session(&gorm.Session{
		NewDB:   true,
		Context: ctx,
	})
	session.Statement.ConnPool = conn
	session.ConnPool = conn

	return session, cleanup, nil
}

func (r *mysqlRawQueryResolver) IsBaseTable(ctx context.Context, database, schema *string, table string) (bool, error) {
	_ = schema

	dbName := lo.FromPtr(database)

	var tableType string

	err := r.repo.base.DB().WithContext(ctx).
		Table("information_schema.TABLES").
		Select("TABLE_TYPE").
		Where("TABLE_SCHEMA = ? AND TABLE_NAME = ?", dbName, table).
		Limit(1).
		Scan(&tableType).Error
	if err != nil {
		return false, err
	}

	return tableType == "BASE TABLE", nil
}

func (r *mysqlRawQueryResolver) LoadTableColumns(ctx context.Context, database, _ *string, table string) ([]dto.Column, error) {
	columns, err := r.repo.columns(ctx, database, lo.ToPtr(table), nil, true, true)
	if err != nil {
		return nil, err
	}

	return columnListToResponse(columns), nil
}

func (r *mysqlRawQueryResolver) BuildNodeID(_ context.Context, database, schema, table string) string {
	_ = schema

	if database == "" {
		options, err := helper.RawJSONToStruct[dto.MysqlCreateConnectionParams](json.RawMessage(r.repo.base.Connection().Options))
		if err == nil {
			database = lo.FromPtr(options.Database)
		}
	}

	return fmt.Sprintf("%s.%s", database, table)
}
