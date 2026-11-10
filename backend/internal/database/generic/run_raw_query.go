package databaseGeneric

import (
	"context"
	"database/sql/driver"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

// session returns the connection pool, or one connection switched to the chosen database when the dialect's
// namespace is a database (ClickHouse). A schema (SQL Server) cannot be switched per session.
func (r *Repository) session(ctx context.Context, database *string) (*gorm.DB, func(), error) {
	name := strings.TrimSpace(lo.FromPtr(database))
	if name == "" || r.d.NamespaceIsSchema() {
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

	// USE outlives the query on a pooled connection, so remember the session database and restore it.
	var original string
	if err := conn.QueryRowContext(ctx, "SELECT currentDatabase()").Scan(&original); err != nil {
		_ = conn.Close()

		return nil, nil, err
	}

	cleanup := func() {
		// A connection that cannot be restored is discarded instead of going back to the pool.
		if _, err := conn.ExecContext(context.WithoutCancel(ctx), "USE "+r.d.Quote(original)); err != nil {
			_ = conn.Raw(func(any) error { return driver.ErrBadConn })
		}

		_ = conn.Close()
	}

	if _, err := conn.ExecContext(ctx, "USE "+r.d.Quote(name)); err != nil {
		cleanup()

		return nil, nil, err
	}

	session := r.base.DB().Session(&gorm.Session{NewDB: true, Context: ctx})
	session.Statement.ConnPool = conn
	session.ConnPool = conn

	return session, cleanup, nil
}

func (r *Repository) RunRawQuery(ctx context.Context, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	db, cleanup, err := r.session(ctx, req.Database)
	if err != nil {
		return r.base.CommandResponseBuilder(&dto.RawQueryResponse{Query: req.Query}, 0, err), nil
	}
	defer cleanup()

	if !r.d.ReturnsRows(req.Query) {
		start := time.Now()
		err := db.WithContext(ctx).Exec(req.Query).Error

		return r.base.CommandResponseBuilder(&dto.RawQueryResponse{Query: req.Query}, time.Since(start), err), nil
	}

	resp, err := r.base.RunRawQueryOn(ctx, db, req)
	if err != nil || resp == nil {
		return resp, err
	}

	return databaseCore.EnrichRawQueryResponse(ctx, req, resp, rawResolver{r})
}

func (r *Repository) StreamRawQuery(ctx context.Context, req *dto.RawQueryRequest, chunkSize int, fn func(columns []dto.Column, rows []map[string]any) error) error {
	db, cleanup, err := r.session(ctx, req.Database)
	if err != nil {
		return err
	}
	defer cleanup()

	return r.base.StreamRawQueryOn(ctx, db, req.Query, chunkSize, fn)
}

type rawResolver struct{ r *Repository }

func (x rawResolver) namespace(ctx context.Context, database, schema *string) string {
	if ns := x.r.namespaceOf(database, schema); ns != "" {
		return ns
	}

	ns, _ := x.r.d.DefaultNamespace(ctx, x.r.base.DB().WithContext(ctx))

	return ns
}

func (x rawResolver) IsBaseTable(ctx context.Context, database, schema *string, table string) (bool, error) {
	if !x.r.d.Editable() {
		return false, nil
	}

	tables, err := x.r.d.Tables(ctx, x.r.base.DB().WithContext(ctx), x.namespace(ctx, database, schema))

	return lo.Contains(tables, table), err
}

func (x rawResolver) LoadTableColumns(ctx context.Context, database, schema *string, table string) ([]dto.Column, error) {
	ns := x.namespace(ctx, database, schema)

	columns, err := x.r.d.Columns(ctx, x.r.base.DB().WithContext(ctx), ns, table)
	if err != nil {
		return nil, err
	}

	return x.r.columnsToResponse(ctx, ns, table, columns, nil, true), nil
}

func (x rawResolver) BuildNodeID(ctx context.Context, database, schema, table string) string {
	return nodeID(x.namespace(ctx, lo.EmptyableToPtr(database), lo.EmptyableToPtr(schema)), table)
}
