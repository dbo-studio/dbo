package databasePostgres

import (
	"context"
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/samber/lo"
)

type postgresRawQueryResolver struct {
	repo *PostgresRepository
}

func (r *PostgresRepository) RunRawQuery(ctx context.Context, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	resp, err := r.base.RunRawQuery(ctx, req)
	if err != nil || resp == nil {
		return resp, err
	}

	return databaseCore.EnrichRawQueryResponse(ctx, req, resp, &postgresRawQueryResolver{repo: r})
}

func (r *postgresRawQueryResolver) IsBaseTable(ctx context.Context, database, schema *string, table string) (bool, error) {
	conn, err := r.repo.db(ctx, database)
	if err != nil {
		return false, err
	}

	var relkind string
	query := conn.WithContext(ctx).Raw(`
		SELECT c.relkind
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE c.relname = ?
			AND c.relkind IN ('r', 'v', 'm')
			AND n.nspname NOT IN ('pg_catalog', 'information_schema')
	`, table)

	if schema != nil && *schema != "" {
		query = conn.WithContext(ctx).Raw(`
			SELECT c.relkind
			FROM pg_class c
			JOIN pg_namespace n ON n.oid = c.relnamespace
			WHERE c.relname = ?
				AND n.nspname = ?
				AND c.relkind IN ('r', 'v', 'm')
		`, table, *schema)
	}

	err = query.Scan(&relkind).Error
	if err != nil {
		return false, err
	}

	return relkind == "r", nil
}

func (r *postgresRawQueryResolver) LoadTableColumns(ctx context.Context, database, schema *string, table string) ([]dto.Column, error) {
	columns, err := r.repo.columns(ctx, database, lo.ToPtr(table), schema, nil, true, true)
	if err != nil {
		return nil, err
	}

	return columnListToResponse(columns), nil
}

func (r *postgresRawQueryResolver) BuildNodeID(ctx context.Context, database, schema, table string) string {
	if database == "" {
		database = databaseConnection.DefaultPostgresqlDatabase(r.repo.base.Connection())
	}
	if schema == "" {
		if resolved, err := r.repo.tableSchema(ctx, stringPtrOrNil(database), table); err == nil && resolved != "" {
			schema = resolved
		} else {
			schema = "public"
		}
	}
	return fmt.Sprintf("%s.%s.%s", database, schema, table)
}

func (r *PostgresRepository) tableSchema(ctx context.Context, database *string, table string) (string, error) {
	conn, err := r.db(ctx, database)
	if err != nil {
		return "", err
	}

	var schema string
	err = conn.WithContext(ctx).Raw(`
		SELECT n.nspname
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE c.relname = ?
			AND c.relkind = 'r'
			AND n.nspname NOT IN ('pg_catalog', 'information_schema')
		ORDER BY CASE WHEN n.nspname = 'public' THEN 0 ELSE 1 END, n.nspname
		LIMIT 1
	`, table).Scan(&schema).Error
	if err != nil {
		return "", err
	}
	return schema, nil
}

func stringPtrOrNil(value string) *string {
	if value == "" {
		return nil
	}
	return lo.ToPtr(value)
}
