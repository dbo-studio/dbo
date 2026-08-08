package databaseMysql

import (
	"context"
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
)

type mysqlRawQueryResolver struct {
	repo *MySQLRepository
}

func (r *MySQLRepository) RunRawQuery(ctx context.Context, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	resp, err := r.base.RunRawQuery(ctx, req)
	if err != nil || resp == nil {
		return resp, err
	}

	return databaseCore.EnrichRawQueryResponse(ctx, req, resp, &mysqlRawQueryResolver{repo: r})
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
