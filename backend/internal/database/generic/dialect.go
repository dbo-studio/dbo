package databaseGeneric

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"gorm.io/gorm"
)

// ColumnInfo is one column as the dialect reports it.
type ColumnInfo struct {
	Name         string
	DataType     string
	NotNull      bool
	Default      *string
	IsPrimaryKey bool
	IsIdentity   bool
	Length       *int64
}

// ColSpec is a column as the Object Form submits it, already validated.
type ColSpec struct {
	Name     string
	Type     string
	NotNull  bool
	Primary  bool
	Identity bool
	Default  string
}

// ForeignKey is one foreign key constraint of a table.
type ForeignKey struct {
	Name       string
	Columns    []string
	RefSchema  string
	RefTable   string
	RefColumns []string
	OnUpdate   string
	OnDelete   string
}

// Dialect holds everything that differs between the SQL servers this driver serves.
// A namespace is the level above tables: a schema (SQL Server) or a database (ClickHouse).
type Dialect interface {
	// Editable reports whether rows can be changed from the grid.
	Editable() bool
	Quote(ident string) string
	// Paginate appends ordering and paging to a SELECT. order is already quoted and may be empty.
	Paginate(query, order string, limit, offset int) string
	Version(ctx context.Context, db *gorm.DB) (string, error)
	Namespaces(ctx context.Context, db *gorm.DB) ([]string, error)
	Tables(ctx context.Context, db *gorm.DB, namespace string) ([]string, error)
	Views(ctx context.Context, db *gorm.DB, namespace string) ([]string, error)
	Columns(ctx context.Context, db *gorm.DB, namespace, table string) ([]ColumnInfo, error)
	ForeignKeys(ctx context.Context, db *gorm.DB, namespace, table string) ([]ForeignKey, error)
	Indexes(ctx context.Context, db *gorm.DB, namespace, table string) ([]contract.StructureIndex, error)
	// CastText wraps a quoted column so LIKE filters work on any column type.
	CastText(column string) string
	// DefaultNamespace is the namespace of the current session (SCHEMA_NAME(), currentDatabase()).
	DefaultNamespace(ctx context.Context, db *gorm.DB) (string, error)
	// MapType returns a mapped type, or "" to use the shared mapping.
	MapType(dataType string) string
	// Schema editing. Table names passed in are unquoted; the dialect quotes them.
	ColumnFields() []contract.FormField
	ColumnRow(c ColumnInfo) map[string]any
	ColumnSpec(d *dto.MysqlTableColumnData) (ColSpec, error)
	CreateTable(namespace, table string, cols []ColSpec) string
	AddColumn(namespace, table string, c ColSpec) string
	DropColumn(namespace, table, column string) string
	// ChangeColumn returns the statements that turn old into next (rename included).
	ChangeColumn(namespace, table string, old, next ColSpec) ([]string, error)
	RenameTable(namespace, old, next string) string
	DropTable(namespace, table string) string
	DropView(namespace, view string) string
	CreateView(namespace, view, query string, replace bool) string
	ViewQuery(ctx context.Context, db *gorm.DB, namespace, view string) (string, error)
	// ReturnsRows is false for statements that must go through Exec: ClickHouse's driver reports a
	// write sent as a query as a bad connection, and database/sql then runs it again (three times).
	ReturnsRows(query string) bool
	// Transactional is false when a failed statement cannot be rolled back with the ones before it.
	Transactional() bool
	// NamespaceIsSchema is true when a namespace is a schema, false when it is a database.
	NamespaceIsSchema() bool
}
