// Package databaseGeneric is the SQL driver for host/port servers that expose catalog views
// (SQL Server, ClickHouse). A Dialect supplies the catalog queries and quoting; everything else is shared.
package databaseGeneric

import (
	"context"
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/dbo-studio/dbo/internal/model"
)

type Repository struct {
	base *databaseCore.BaseRepository
	d    Dialect
}

var dialects = map[string]Dialect{}

// RegisterDialect makes a connection type servable. Dialect packages call it from init.
func RegisterDialect(connectionType string, d Dialect) { dialects[connectionType] = d }

func New(ctx context.Context, connection *model.Connection, cm *databaseConnection.ConnectionManager, deps databaseCore.DriverDeps) (contract.DatabaseRepository, error) {
	d, ok := dialects[connection.ConnectionType]
	if !ok {
		return nil, fmt.Errorf("unsupported database type: %s", connection.ConnectionType)
	}

	base, err := databaseCore.NewBaseRepository(ctx, connection, cm, deps.Cache, deps.Logger)
	if err != nil {
		return nil, err
	}

	return &Repository{base: base, d: d}, nil
}

func (r *Repository) Version(ctx context.Context) (string, error) {
	return r.d.Version(ctx, r.base.DB().WithContext(ctx))
}

func (r *Repository) ImportData(ctx context.Context, job dto.ImportJob, rows [][]string, columns []string) (*contract.ImportResult, error) {
	if r.d.Transactional() || job.ContinueOnError {
		return r.base.ImportData(ctx, job, rows, columns)
	}

	return r.importWithoutTransactions(ctx, job, rows, columns)
}

// node splits "namespace.table"; a table name may itself contain dots.
func node(id string) (namespace, table string) {
	namespace, table, _ = strings.Cut(id, ".")

	return namespace, table
}

func nodeID(namespace, table string) string {
	if table == "" {
		return namespace
	}

	return namespace + "." + table
}

func (r *Repository) qualified(namespace, table string) string {
	return r.d.Quote(namespace) + "." + r.d.Quote(table)
}

func (r *Repository) mapType(dataType string) string {
	if mapped := r.d.MapType(dataType); mapped != "" {
		return mapped
	}

	return r.base.ColumnMappedFormat(dataType)
}

// nsPtrs returns the namespace as the (database, schema) pair callers of the AI/metadata contracts use.
func (r *Repository) namespaceOf(database, schema *string) string {
	if r.d.NamespaceIsSchema() && schema != nil {
		return *schema
	}

	if !r.d.NamespaceIsSchema() && database != nil {
		return *database
	}

	return ""
}
