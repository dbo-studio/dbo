package databaseClickhouse

import (
	"context"
	"fmt"
	generic "github.com/dbo-studio/dbo/internal/database/generic"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

func init() { generic.RegisterDialect(contract.ClickHouse, clickhouse{}) }

// clickhouse: a namespace is a database. Read-only: ClickHouse has no row-level UPDATE/DELETE
// semantics the grid can rely on, and no transactions.
type clickhouse struct{}

func (clickhouse) Editable() bool { return false }

func (clickhouse) NamespaceIsSchema() bool { return false }

func (clickhouse) Quote(ident string) string {
	return "`" + strings.NewReplacer("\\", "\\\\", "`", "\\`").Replace(ident) + "`"
}

func (clickhouse) CastText(column string) string { return fmt.Sprintf("toString(%s)", column) }

func (clickhouse) Paginate(query, order string, limit, offset int) string {
	if order != "" {
		query += " ORDER BY " + order
	}

	return fmt.Sprintf("%s LIMIT %d OFFSET %d", query, limit, offset)
}

func (clickhouse) MapType(dataType string) string {
	switch t := unwrapClickHouseType(dataType); {
	case strings.HasPrefix(t, "Array("), strings.HasPrefix(t, "Map("), strings.HasPrefix(t, "Tuple("), strings.HasPrefix(t, "Nested("):
		return "json"
	case strings.HasPrefix(t, "Enum"):
		return "enum"
	default:
		return ""
	}
}

// unwrapClickHouseType drops Nullable(...) / LowCardinality(...) wrappers.
func unwrapClickHouseType(t string) string {
	for {
		inner, ok := strings.CutSuffix(t, ")")
		if !ok {
			return t
		}

		switch {
		case strings.HasPrefix(inner, "Nullable("):
			t = strings.TrimPrefix(inner, "Nullable(")
		case strings.HasPrefix(inner, "LowCardinality("):
			t = strings.TrimPrefix(inner, "LowCardinality(")
		default:
			return t
		}
	}
}

func (clickhouse) Version(_ context.Context, db *gorm.DB) (string, error) {
	var version string

	return version, db.Raw("SELECT version()").Scan(&version).Error
}

func (clickhouse) DefaultNamespace(_ context.Context, db *gorm.DB) (string, error) {
	var name string

	return name, db.Raw("SELECT currentDatabase()").Scan(&name).Error
}

func (clickhouse) Namespaces(_ context.Context, db *gorm.DB) ([]string, error) {
	var names []string

	err := db.Raw(`SELECT name FROM system.databases WHERE name NOT IN ('system', 'INFORMATION_SCHEMA', 'information_schema') ORDER BY name`).Scan(&names).Error

	return names, err
}

func (clickhouse) objects(db *gorm.DB, namespace string, views bool) ([]string, error) {
	var names []string

	op := lo.Ternary(views, "IN", "NOT IN")
	err := db.Raw(fmt.Sprintf(`SELECT name FROM system.tables WHERE database = ? AND is_temporary = 0 AND engine %s ('View', 'MaterializedView', 'LiveView', 'WindowView') ORDER BY name`, op), namespace).Scan(&names).Error

	return names, err
}

func (c clickhouse) Tables(_ context.Context, db *gorm.DB, namespace string) ([]string, error) {
	return c.objects(db, namespace, false)
}

func (c clickhouse) Views(_ context.Context, db *gorm.DB, namespace string) ([]string, error) {
	return c.objects(db, namespace, true)
}

func (clickhouse) Columns(_ context.Context, db *gorm.DB, namespace, table string) ([]generic.ColumnInfo, error) {
	type row struct {
		Name     string
		DataType string
		Dflt     string
		IsPk     int
	}

	var rows []row

	err := db.Raw(`SELECT name, type AS data_type, default_expression AS dflt, toUInt8(is_in_primary_key) AS is_pk
FROM system.columns WHERE database = ? AND table = ? ORDER BY position`, namespace, table).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	return lo.Map(rows, func(r row, _ int) generic.ColumnInfo {
		return generic.ColumnInfo{
			Name:         r.Name,
			DataType:     r.DataType,
			NotNull:      !strings.Contains(r.DataType, "Nullable("),
			Default:      lo.EmptyableToPtr(r.Dflt),
			IsPrimaryKey: r.IsPk == 1,
		}
	}), nil
}

// ClickHouse has no foreign keys.
func (clickhouse) ForeignKeys(context.Context, *gorm.DB, string, string) ([]generic.ForeignKey, error) {
	return nil, nil
}

// --- schema editing ---

// ReturnsRows looks at the first keyword after any leading comments.
func (clickhouse) ReturnsRows(query string) bool {
	s := strings.TrimSpace(query)

	for {
		switch {
		case strings.HasPrefix(s, "--"):
			_, rest, _ := strings.Cut(s, "\n")
			s = strings.TrimSpace(rest)
		case strings.HasPrefix(s, "/*"):
			_, rest, found := strings.Cut(s, "*/")
			if !found {
				return true
			}

			s = strings.TrimSpace(rest)
		default:
			word, _, _ := strings.Cut(strings.ToUpper(s), " ")
			word = strings.TrimLeft(strings.Fields(word + " x")[0], "(")

			return word == "" || rowReturning[word]
		}
	}
}

func (clickhouse) Transactional() bool { return false }
