package databaseMssql

import (
	"context"
	"fmt"
	generic "github.com/dbo-studio/dbo/internal/database/generic"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

func init() { generic.RegisterDialect(contract.SQLServer, mssql{}) }

// mssql: a namespace is a schema of the database named in the connection.
type mssql struct{}

func (mssql) Editable() bool { return true }

func (mssql) NamespaceIsSchema() bool { return true }

func (mssql) Quote(ident string) string { return "[" + strings.ReplaceAll(ident, "]", "]]") + "]" }

func (mssql) CastText(column string) string { return fmt.Sprintf("CAST(%s AS NVARCHAR(MAX))", column) }

// OFFSET/FETCH is only valid after ORDER BY, so an unordered table gets a no-op ordering.
func (mssql) Paginate(query, order string, limit, offset int) string {
	return fmt.Sprintf("%s ORDER BY %s OFFSET %d ROWS FETCH NEXT %d ROWS ONLY", query, lo.Ternary(order == "", "(SELECT NULL)", order), offset, limit)
}

func (mssql) MapType(dataType string) string {
	if strings.EqualFold(dataType, "bit") {
		return "boolean"
	}

	return ""
}

func (mssql) Version(_ context.Context, db *gorm.DB) (string, error) {
	var version string

	return version, db.Raw("SELECT CAST(SERVERPROPERTY('ProductVersion') AS NVARCHAR(50))").Scan(&version).Error
}

func (mssql) DefaultNamespace(_ context.Context, db *gorm.DB) (string, error) {
	var schema string

	return schema, db.Raw("SELECT SCHEMA_NAME()").Scan(&schema).Error
}

func (mssql) Namespaces(_ context.Context, db *gorm.DB) ([]string, error) {
	var names []string

	err := db.Raw(`SELECT name FROM sys.schemas WHERE name NOT IN ('sys', 'INFORMATION_SCHEMA', 'guest') AND name NOT LIKE 'db[_]%' ORDER BY name`).Scan(&names).Error

	return names, err
}

func (mssql) objects(db *gorm.DB, namespace, tableType string) ([]string, error) {
	var names []string

	err := db.Raw(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = ? ORDER BY TABLE_NAME`, namespace, tableType).Scan(&names).Error

	return names, err
}

func (m mssql) Tables(_ context.Context, db *gorm.DB, namespace string) ([]string, error) {
	return m.objects(db, namespace, "BASE TABLE")
}

func (m mssql) Views(_ context.Context, db *gorm.DB, namespace string) ([]string, error) {
	return m.objects(db, namespace, "VIEW")
}

func (mssql) Columns(_ context.Context, db *gorm.DB, namespace, table string) ([]generic.ColumnInfo, error) {
	type row struct {
		Name     string
		DataType string
		NotNull  int
		Dflt     *string
		Length   *int64
		IsPk     int
		IsIdent  int
		Computed *string
	}

	var rows []row

	err := db.Raw(`
SELECT c.COLUMN_NAME AS name,
       CASE WHEN c.DATA_TYPE IN ('decimal', 'numeric') THEN c.DATA_TYPE + '(' + CAST(c.NUMERIC_PRECISION AS VARCHAR(5)) + ',' + CAST(c.NUMERIC_SCALE AS VARCHAR(5)) + ')'
            WHEN c.CHARACTER_MAXIMUM_LENGTH IS NULL THEN c.DATA_TYPE
            WHEN c.CHARACTER_MAXIMUM_LENGTH = -1 THEN c.DATA_TYPE + '(max)'
            ELSE c.DATA_TYPE + '(' + CAST(c.CHARACTER_MAXIMUM_LENGTH AS VARCHAR(10)) + ')' END AS data_type,
       CASE WHEN c.IS_NULLABLE = 'NO' THEN 1 ELSE 0 END AS not_null,
       c.COLUMN_DEFAULT AS dflt,
       CASE WHEN c.CHARACTER_MAXIMUM_LENGTH > 0 THEN c.CHARACTER_MAXIMUM_LENGTH END AS length,
       CASE WHEN EXISTS (
         SELECT 1 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
         JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS t ON t.CONSTRAINT_NAME = k.CONSTRAINT_NAME AND t.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
         WHERE t.CONSTRAINT_TYPE = 'PRIMARY KEY' AND k.TABLE_SCHEMA = c.TABLE_SCHEMA AND k.TABLE_NAME = c.TABLE_NAME AND k.COLUMN_NAME = c.COLUMN_NAME
       ) THEN 1 ELSE 0 END AS is_pk,
       COLUMNPROPERTY(OBJECT_ID(QUOTENAME(c.TABLE_SCHEMA) + '.' + QUOTENAME(c.TABLE_NAME)), c.COLUMN_NAME, 'IsIdentity') AS is_ident,
       (SELECT cc.definition FROM sys.computed_columns cc WHERE cc.object_id = OBJECT_ID(QUOTENAME(c.TABLE_SCHEMA) + '.' + QUOTENAME(c.TABLE_NAME)) AND cc.name = c.COLUMN_NAME) AS computed
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_SCHEMA = ? AND c.TABLE_NAME = ?
ORDER BY c.ORDINAL_POSITION`, namespace, table).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	return lo.Map(rows, func(r row, _ int) generic.ColumnInfo {
		col := generic.ColumnInfo{Name: r.Name, DataType: r.DataType, NotNull: r.NotNull == 1, Default: r.Dflt, Length: r.Length, IsPrimaryKey: r.IsPk == 1, IsIdentity: r.IsIdent == 1}
		if r.Computed != nil {
			col.Generated, col.Default = true, r.Computed
		}

		return col
	}), nil
}

func (mssql) ForeignKeys(_ context.Context, db *gorm.DB, namespace, table string) ([]generic.ForeignKey, error) {
	type row struct {
		Name      string
		RefSchema string
		RefTable  string
		Col       string
		RefCol    string
		OnUpdate  string
		OnDelete  string
	}

	var rows []row

	err := db.Raw(`
SELECT fk.name AS name, SCHEMA_NAME(rt.schema_id) AS ref_schema, rt.name AS ref_table, pc.name AS col, rc.name AS ref_col,
       fk.update_referential_action_desc AS on_update, fk.delete_referential_action_desc AS on_delete
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
JOIN sys.tables pt ON pt.object_id = fk.parent_object_id
JOIN sys.tables rt ON rt.object_id = fk.referenced_object_id
JOIN sys.columns pc ON pc.object_id = fkc.parent_object_id AND pc.column_id = fkc.parent_column_id
JOIN sys.columns rc ON rc.object_id = fkc.referenced_object_id AND rc.column_id = fkc.referenced_column_id
WHERE SCHEMA_NAME(pt.schema_id) = ? AND pt.name = ?
ORDER BY fk.name, fkc.constraint_column_id`, namespace, table).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	var keys []generic.ForeignKey

	for _, r := range rows {
		if len(keys) == 0 || keys[len(keys)-1].Name != r.Name {
			keys = append(keys, generic.ForeignKey{Name: r.Name, RefSchema: r.RefSchema, RefTable: r.RefTable, OnUpdate: r.OnUpdate, OnDelete: r.OnDelete})
		}

		last := &keys[len(keys)-1]
		last.Columns = append(last.Columns, r.Col)
		last.RefColumns = append(last.RefColumns, r.RefCol)
	}

	return keys, nil
}

func (m mssql) Indexes(_ context.Context, db *gorm.DB, namespace, table string) ([]contract.StructureIndex, error) {
	type row struct {
		Name   string
		Unique bool
		Cols   string
	}

	var rows []row

	err := db.Raw(`
SELECT i.name AS name, i.is_unique AS "unique", STRING_AGG(c.name, ',') WITHIN GROUP (ORDER BY ic.key_ordinal) AS cols
FROM sys.indexes i
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE i.object_id = OBJECT_ID(?) AND i.is_primary_key = 0 AND i.is_unique_constraint = 0 AND i.name IS NOT NULL AND ic.is_included_column = 0
GROUP BY i.name, i.is_unique
ORDER BY i.name`, m.Quote(namespace)+"."+m.Quote(table)).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	return lo.Map(rows, func(r row, _ int) contract.StructureIndex {
		return contract.StructureIndex{Name: r.Name, Unique: r.Unique, Columns: strings.Split(r.Cols, ",")}
	}), nil
}

// --- schema editing ---

func (mssql) ReturnsRows(string) bool { return true }

func (mssql) Transactional() bool { return true }
