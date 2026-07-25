package databaseSqlite

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

func (r *SQLiteRepository) buildAllColumnDefinitions(paramsMap *tableParamsMap) string {
	var parts []string

	if paramsMap.columnParams != nil && len(paramsMap.columnParams.Columns) > 0 {
		filteredColumns := r.filterActiveColumns(paramsMap.columnParams.Columns)
		if defs := r.buildColumnDefinitions(filteredColumns); defs != "" {
			parts = append(parts, defs)
		}
	}

	if paramsMap.foreignKeyParams != nil && len(paramsMap.foreignKeyParams.Columns) > 0 {
		if defs := r.buildForeignKeyDefinitions(paramsMap.foreignKeyParams.Columns); defs != "" {
			parts = append(parts, defs)
		}
	}

	if paramsMap.keyParams != nil && len(paramsMap.keyParams.Keys) > 0 {
		if defs := r.buildKeyDefinitions(paramsMap.keyParams.Keys); defs != "" {
			parts = append(parts, defs)
		}
	}

	return strings.Join(parts, ", ")
}

func (r *SQLiteRepository) buildTableRecreateQueries(tmpTableName, oldName, newName string, tableParams *dto.SQLiteTableParamsData, columnDefs string, paramsMap *tableParamsMap) []string {
	queries := []string{}

	createQuery := r.buildCreateTableQuery(quoteIdent(tmpTableName), tableParams, columnDefs)
	queries = append(queries, createQuery)

	commonColumns := r.getCommonColumns(paramsMap.columnParams)
	if len(commonColumns) > 0 {
		insertQuery := fmt.Sprintf("INSERT INTO %s (%s) SELECT %s FROM %s",
			quoteIdent(tmpTableName),
			strings.Join(commonColumns, ", "),
			strings.Join(commonColumns, ", "),
			quoteIdent(oldName))
		queries = append(queries, insertQuery)
	}

	queries = append(queries, fmt.Sprintf("DROP TABLE %s", quoteIdent(oldName)))
	queries = append(queries, fmt.Sprintf("ALTER TABLE %s RENAME TO %s", quoteIdent(tmpTableName), quoteIdent(newName)))

	return queries
}

func (r *SQLiteRepository) buildCreateTableQuery(tableName string, params *dto.SQLiteTableParamsData, columnDefs string) string {
	var parts []string

	if params.Temporary != nil && *params.Temporary {
		parts = append(parts, "CREATE TEMPORARY TABLE")
	} else {
		parts = append(parts, "CREATE TABLE")
	}

	parts = append(parts, tableName)

	if columnDefs != "" {
		parts = append(parts, fmt.Sprintf("(%s)", columnDefs))
	}

	if params.WithoutRowid != nil && *params.WithoutRowid {
		parts = append(parts, "WITHOUT ROWID")
	}

	if params.Strict != nil && *params.Strict {
		parts = append(parts, "STRICT")
	}

	return strings.Join(parts, " ")
}

func (r *SQLiteRepository) buildColumnDefinitions(columns []dto.SQLiteTableColumn) string {
	if len(columns) == 0 {
		return ""
	}

	defs := make([]string, 0, len(columns))
	for _, col := range columns {
		if def := r.buildSingleColumnDefinition(col); def != "" {
			defs = append(defs, def)
		}
	}

	return strings.Join(defs, ", ")
}

func (r *SQLiteRepository) buildSingleColumnDefinition(col dto.SQLiteTableColumn) string {
	if col.New == nil {
		return ""
	}

	name := quoteIdent(lo.FromPtr(col.New.Name))
	dataType := lo.FromPtr(col.New.DataType)
	def := fmt.Sprintf("%s %s", name, dataType)

	if col.New.ColumnKind != nil && lo.FromPtr(col.New.ColumnKind) == "generated" {
		return r.buildGeneratedColumnDefinition(def, col.New)
	}

	if col.New.NotNull != nil && *col.New.NotNull {
		def += " NOT NULL"
	}

	if col.New.Default != nil && *col.New.Default != "" {
		def += fmt.Sprintf(" DEFAULT %s", *col.New.Default)
	}

	if col.New.CollectionName != nil && *col.New.CollectionName != "" && *col.New.CollectionName != "stored" {
		def += fmt.Sprintf(" COLLATE %s", *col.New.CollectionName)
	}

	if col.New.OnNullConflicts != nil && *col.New.OnNullConflicts != "" {
		def += fmt.Sprintf(" ON CONFLICT %s", *col.New.OnNullConflicts)
	}

	return def
}

func (r *SQLiteRepository) buildGeneratedColumnDefinition(baseDef string, colData *dto.SQLiteTableColumnData) string {
	def := baseDef + " GENERATED ALWAYS AS"

	if colData.Default != nil && *colData.Default != "" {
		def += fmt.Sprintf(" (%s)", *colData.Default)
	}

	if colData.CollectionName != nil && *colData.CollectionName == "stored" {
		def += " STORED"
	} else {
		def += " VIRTUAL"
	}

	return def
}

func (r *SQLiteRepository) buildForeignKeyDefinitions(foreignKeys []dto.SQLiteTableForeignKey) string {
	filtered := r.filterActiveForeignKeys(foreignKeys)
	if len(filtered) == 0 {
		return ""
	}

	defs := make([]string, 0, len(filtered))
	for _, fk := range filtered {
		if def := r.buildSingleForeignKeyDefinition(fk); def != "" {
			defs = append(defs, def)
		}
	}

	return strings.Join(defs, ", ")
}

func (r *SQLiteRepository) buildSingleForeignKeyDefinition(fk dto.SQLiteTableForeignKey) string {
	if fk.New == nil {
		return ""
	}

	var parts []string

	if fk.New.ConstraintName != nil && *fk.New.ConstraintName != "" {
		parts = append(parts, fmt.Sprintf("CONSTRAINT %s", quoteIdent(*fk.New.ConstraintName)))
	}

	parts = append(parts, "FOREIGN KEY")
	parts = append(parts, fmt.Sprintf("(%s)", r.quoteColumnList(fk.New.SourceColumns)))
	parts = append(parts, "REFERENCES")
	parts = append(parts, quoteIdent(lo.FromPtr(fk.New.TargetTable)))

	if len(fk.New.TargetColumns) > 0 {
		parts = append(parts, fmt.Sprintf("(%s)", r.quoteColumnList(fk.New.TargetColumns)))
	}

	if fk.New.OnUpdate != nil && *fk.New.OnUpdate != "" {
		parts = append(parts, fmt.Sprintf("ON UPDATE %s", *fk.New.OnUpdate))
	}

	if fk.New.OnDelete != nil && *fk.New.OnDelete != "" {
		parts = append(parts, fmt.Sprintf("ON DELETE %s", *fk.New.OnDelete))
	}

	if fk.New.IsDeferrable != nil && *fk.New.IsDeferrable {
		parts = append(parts, "DEFERRABLE")
		if fk.New.InitiallyDeferred != nil && *fk.New.InitiallyDeferred {
			parts = append(parts, "INITIALLY DEFERRED")
		}
	}

	return strings.Join(parts, " ")
}

func (r *SQLiteRepository) buildKeyDefinitions(keys []dto.SQLiteTableKey) string {
	filtered := r.filterActiveKeys(keys)
	if len(filtered) == 0 {
		return ""
	}

	defs := make([]string, 0, len(filtered))
	for _, key := range filtered {
		if def := r.buildSingleKeyDefinition(key); def != "" {
			defs = append(defs, def)
		}
	}

	return strings.Join(defs, ", ")
}

func (r *SQLiteRepository) buildSingleKeyDefinition(key dto.SQLiteTableKey) string {
	if key.New == nil {
		return ""
	}

	keyType := r.getKeyType(key.New.Type)
	if keyType == "" {
		return ""
	}

	var parts []string

	if key.New.Name != nil && *key.New.Name != "" {
		parts = append(parts, fmt.Sprintf("CONSTRAINT %s", quoteIdent(*key.New.Name)))
	}

	parts = append(parts, keyType)

	if len(key.New.Columns) > 0 {
		parts = append(parts, fmt.Sprintf("(%s)", r.quoteColumnList(key.New.Columns)))
	}

	return strings.Join(parts, " ")
}

func (r *SQLiteRepository) buildCreateIndexesQueries(tableName string, indexes []dto.SQLiteIndex) []string {
	queries := make([]string, 0)
	for _, idx := range indexes {
		if idx.New == nil {
			continue
		}
		if idx.Added != nil && !lo.FromPtr(idx.Added) {
			continue
		}

		if query := r.buildCreateIndexQuery(tableName, idx); query != "" {
			queries = append(queries, query)
		}
	}
	return queries
}

func (r *SQLiteRepository) buildCreateIndexQuery(tableName string, idx dto.SQLiteIndex) string {
	unique := ""
	if idx.New.Unique != nil && *idx.New.Unique {
		unique = "UNIQUE "
	}

	name := lo.FromPtr(idx.New.Name)
	if name == "" {
		name = fmt.Sprintf("%s_%s_idx", tableName, strings.Join(idx.New.Columns, "_"))
	}

	order := ""
	if idx.New.Order != nil && *idx.New.Order != "" {
		order = " " + *idx.New.Order
	}

	cols := make([]string, len(idx.New.Columns))
	for i, c := range idx.New.Columns {
		cols[i] = quoteIdent(c) + order
	}

	return fmt.Sprintf("CREATE %sINDEX %s ON %s (%s)",
		unique, quoteIdent(name), quoteIdent(tableName), strings.Join(cols, ", "))
}

func (r *SQLiteRepository) buildEditIndexesQueries(tableName string, indexes []dto.SQLiteIndex) []string {
	queries := make([]string, 0)
	for _, idx := range indexes {
		if idx.Deleted != nil && *idx.Deleted && idx.Old != nil && idx.Old.Name != nil {
			queries = append(queries, fmt.Sprintf("DROP INDEX IF EXISTS %s", quoteIdent(*idx.Old.Name)))
			continue
		}

		if idx.Added != nil && *idx.Added {
			if query := r.buildCreateIndexQuery(tableName, idx); query != "" {
				queries = append(queries, query)
			}
			continue
		}

		if r.isIndexRenamed(idx) {
			queries = append(queries, fmt.Sprintf("DROP INDEX IF EXISTS %s", quoteIdent(*idx.Old.Name)))
			if query := r.buildCreateIndexQuery(tableName, idx); query != "" {
				queries = append(queries, query)
			}
		}
	}
	return queries
}
