package databaseSqlite

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

func (r *SQLiteRepository) handleTableCommands(node string, tabId map[contract.TreeTab]any, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	queries := []string{}
	var tableName string

	var treeTab contract.TreeTab
	for key := range tabId {
		treeTab = key
		break
	}

	isTableRelatedTab := treeTab == contract.TableTab ||
		treeTab == contract.TableColumnsTab ||
		treeTab == contract.TableForeignKeysTab ||
		treeTab == contract.TableKeysTab ||
		treeTab == contract.TableIndexesTab

	if !isTableRelatedTab && action != contract.DropTableAction {
		return queries, nil
	}

	if action == contract.DropTableAction {
		query := fmt.Sprintf("DROP TABLE %s", node)
		queries = append(queries, query)
		return queries, nil
	}

	tableParamsDto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.SQLiteTableParams](params)
	if err != nil {
		return nil, err
	}

	columnParamsDto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.SQLiteTableColumnParams](params)
	if err != nil {
		return nil, err
	}

	foreignKeyParamsDto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.SQLiteTableForeignKeyParams](params)
	if err != nil {
		return nil, err
	}

	keyParamsDto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.SQLiteTableKeyParams](params)
	if err != nil {
		return nil, err
	}

	indexParamsDto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.SQLiteIndexParams](params)
	if err != nil {
		return nil, err
	}

	tableParams := tableParamsDto[contract.TableTab]
	columnParams := columnParamsDto[contract.TableColumnsTab]
	foreignKeyParams := foreignKeyParamsDto[contract.TableForeignKeysTab]
	keyParams := keyParamsDto[contract.TableKeysTab]
	indexParams := indexParamsDto[contract.TableIndexesTab]

	if tableParams == nil || tableParams.Old == nil || tableParams.Old.Name == nil {
		return nil, fmt.Errorf("table names are required")
	}

	if action == contract.CreateTableAction {
		tableName = lo.FromPtr(tableParams.New.Name)

		columnDefs := ""
		if columnParams != nil && len(columnParams.Columns) > 0 {
			columnDefs = r.buildColumnDefinitions(columnParams.Columns)
		}

		if foreignKeyParams != nil && len(foreignKeyParams.Columns) > 0 {
			foreignKeyDefs := r.buildForeignKeyDefinitions(foreignKeyParams.Columns)
			if columnDefs != "" && foreignKeyDefs != "" {
				columnDefs += ", " + foreignKeyDefs
			} else if foreignKeyDefs != "" {
				columnDefs = foreignKeyDefs
			}
		}

		if keyParams != nil && len(keyParams.Keys) > 0 {
			keyDefs := r.buildKeyDefinitions(keyParams.Keys)
			if columnDefs != "" && keyDefs != "" {
				columnDefs += ", " + keyDefs
			} else if keyDefs != "" {
				columnDefs = keyDefs
			}
		}

		query := r.buildCreateTableQuery(quoteIdent(tableName), tableParams.New, columnDefs)
		queries = append(queries, query)

		// Create indexes after table is created
		if indexParams != nil && len(indexParams.Indexes) > 0 {
			queries = append(queries, r.buildCreateIndexesQueries(tableName, indexParams.Indexes)...)
		}
	}

	if action == contract.EditTableAction {
		oldName := *tableParams.Old.Name
		var newName string
		if tableParams.New != nil && tableParams.New.Name != nil && *tableParams.New.Name != "" {
			newName = *tableParams.New.Name
		} else {
			newName = oldName
		}

		tableDDL, err := r.getTableDDL(oldName)
		if err != nil {
			return nil, err
		}

		tmpDBName := "__tmp_" + newName

		var columnDefs string

		if columnParams != nil && len(columnParams.Columns) > 0 {
			columnParams.Columns = lo.Filter(columnParams.Columns, func(col dto.SQLiteTableColumn, _ int) bool {
				if col.Added != nil && col.Deleted != nil && *col.Added && *col.Deleted {
					return false
				}
				if col.Added == nil || *col.Added {
					return true
				}

				if col.New == nil {
					return false
				}
				return false
			})

			columnDefs = r.buildColumnDefinitions(columnParams.Columns)
		} else {
			columnDefs = strings.Join(extractColumnDefsFromDDL(tableDDL), ", ")
		}

		if foreignKeyParams != nil && len(foreignKeyParams.Columns) > 0 {
			foreignKeyDefs := r.buildForeignKeyDefinitions(foreignKeyParams.Columns)
			if columnDefs != "" && foreignKeyDefs != "" {
				columnDefs += ", " + foreignKeyDefs
			} else if foreignKeyDefs != "" {
				columnDefs = foreignKeyDefs
			}
		} else if cons := extractConstraintsFromCreateSQL(tableDDL); cons != "" {
			if columnDefs != "" {
				columnDefs += ", " + cons
			} else {
				columnDefs = cons
			}
		}

		if keyParams != nil && len(keyParams.Keys) > 0 {
			keyDefs := r.buildKeyDefinitions(keyParams.Keys)
			if columnDefs != "" && keyDefs != "" {
				columnDefs += ", " + keyDefs
			} else if keyDefs != "" {
				columnDefs = keyDefs
			}
		}

		// 1) create new schema under temporary name
		createTableQuery := r.buildCreateTableQuery(quoteIdent(tmpDBName), tableParams.New, columnDefs)
		queries = append(queries, createTableQuery)

		// 2) copy common columns from current table to tmp

		queries = append(queries, fmt.Sprintf("INSERT INTO %s SELECT * FROM %s", quoteIdent(tmpDBName), quoteIdent(oldName)))

		// 3) drop old and rename tmp to target
		queries = append(queries, fmt.Sprintf("DROP TABLE %s", quoteIdent(oldName)))
		queries = append(queries, fmt.Sprintf("ALTER TABLE %s RENAME TO %s", quoteIdent(tmpDBName), quoteIdent(newName)))

		// 4) rebuild indexes on target
		if indexParams != nil && len(indexParams.Indexes) > 0 {
			queries = append(queries, r.buildEditIndexesQueries(newName, indexParams.Indexes)...)
		}
	}

	if action == contract.DropTableAction {
		query := fmt.Sprintf("DROP TABLE %s", node)
		queries = append(queries, query)
	}

	return queries, nil
}

func (r *SQLiteRepository) buildCreateTableQuery(tableName string, params *dto.SQLiteTableParamsData, columnDefs string) string {
	query := "CREATE"
	if params.Temporary != nil && *params.Temporary {
		query += " TEMPORARY"
	}

	query += fmt.Sprintf(" TABLE %s", tableName)

	if columnDefs != "" {
		query += fmt.Sprintf(" (%s)", columnDefs)
	}

	if params.WithoutRowid != nil && *params.WithoutRowid {
		query += " WITHOUT ROWID"
	}
	if params.Strict != nil && *params.Strict {
		query += " STRICT"
	}
	return query
}

func (r *SQLiteRepository) buildColumnDefinitions(columns []dto.SQLiteTableColumn) string {
	if len(columns) == 0 {
		return ""
	}

	columns = lo.Filter(columns, func(col dto.SQLiteTableColumn, _ int) bool {
		if col.Added != nil && col.Deleted != nil && *col.Added && *col.Deleted {
			return false
		}
		if col.Added == nil || *col.Added {
			return true
		}

		if col.New == nil {
			return false
		}
		return false
	})

	var columnDefs []string
	for _, col := range columns {

		columnDef := fmt.Sprintf("%s %s", quoteIdent(*col.New.Name), *col.New.DataType)

		if col.New.ColumnKind != nil && *col.New.ColumnKind == "generated" {
			columnDef += " GENERATED ALWAYS AS"
			if col.New.Default != nil && *col.New.Default != "" {
				columnDef += fmt.Sprintf(" (%s)", *col.New.Default)
			}
			if col.New.CollectionName != nil && *col.New.CollectionName == "stored" {
				columnDef += " STORED"
			} else {
				columnDef += " VIRTUAL"
			}
		} else {
			if col.New.NotNull != nil && *col.New.NotNull {
				columnDef += " NOT NULL"
			}

			if col.New.Default != nil && *col.New.Default != "" {
				columnDef += fmt.Sprintf(" DEFAULT %s", *col.New.Default)
			}
		}

		if col.New.CollectionName != nil && *col.New.CollectionName != "" && *col.New.CollectionName != "stored" {
			columnDef += fmt.Sprintf(" COLLATE %s", *col.New.CollectionName)
		}

		if col.New.OnNullConflicts != nil && *col.New.OnNullConflicts != "" {
			columnDef += fmt.Sprintf(" ON CONFLICT %s", *col.New.OnNullConflicts)
		}

		columnDefs = append(columnDefs, columnDef)

	}

	if len(columnDefs) == 0 {
		return ""
	}

	result := ""
	for i, def := range columnDefs {
		if i > 0 {
			result += ", "
		}
		result += def
	}

	return result
}

func (r *SQLiteRepository) buildForeignKeyDefinitions(foreignKeys []dto.SQLiteTableForeignKey) string {
	if len(foreignKeys) == 0 {
		return ""
	}

	foreignKeys = lo.Filter(foreignKeys, func(fk dto.SQLiteTableForeignKey, _ int) bool {
		if fk.Added != nil && fk.Deleted != nil && *fk.Added && *fk.Deleted {
			return false
		}
		if fk.Added == nil || *fk.Added {
			return true
		}

		if fk.New == nil {
			return false
		}
		return false
	})

	var foreignKeyDefs []string
	for _, fk := range foreignKeys {

		var constraintDef string

		if fk.New.ConstraintName != nil && *fk.New.ConstraintName != "" {
			constraintDef = fmt.Sprintf("CONSTRAINT %s ", quoteIdent(*fk.New.ConstraintName))
		}

		constraintDef += "FOREIGN KEY ("
		if len(fk.New.SourceColumns) > 0 {
			q := make([]string, len(fk.New.SourceColumns))
			for i, c := range fk.New.SourceColumns {
				q[i] = quoteIdent(c)
			}
			constraintDef += strings.Join(q, ", ")
		}
		constraintDef += ") REFERENCES "

		if fk.New.TargetTable != nil {
			constraintDef += quoteIdent(*fk.New.TargetTable)
		}

		if len(fk.New.TargetColumns) > 0 {
			q := make([]string, len(fk.New.TargetColumns))
			for i, c := range fk.New.TargetColumns {
				q[i] = quoteIdent(c)
			}
			constraintDef += " (" + strings.Join(q, ", ") + ")"
		}

		if fk.New.OnUpdate != nil && *fk.New.OnUpdate != "" {
			constraintDef += fmt.Sprintf(" ON UPDATE %s", *fk.New.OnUpdate)
		}

		if fk.New.OnDelete != nil && *fk.New.OnDelete != "" {
			constraintDef += fmt.Sprintf(" ON DELETE %s", *fk.New.OnDelete)
		}

		if fk.New.IsDeferrable != nil && *fk.New.IsDeferrable {
			constraintDef += " DEFERRABLE"

			if fk.New.InitiallyDeferred != nil && *fk.New.InitiallyDeferred {
				constraintDef += " INITIALLY DEFERRED"
			}
		}

		foreignKeyDefs = append(foreignKeyDefs, constraintDef)

	}

	if len(foreignKeyDefs) == 0 {
		return ""
	}

	result := ""
	for i, def := range foreignKeyDefs {
		if i > 0 {
			result += ", "
		}
		result += def
	}

	return result
}

func (r *SQLiteRepository) buildKeyDefinitions(keys []dto.SQLiteTableKey) string {
	if len(keys) == 0 {
		return ""
	}

	keys = lo.Filter(keys, func(key dto.SQLiteTableKey, _ int) bool {
		if key.Added != nil && key.Deleted != nil && *key.Added && *key.Deleted {
			return false
		}
		if key.Added == nil || *key.Added {
			return true
		}

		if key.New == nil {
			return false
		}
		return false
	})

	var keyDefs []string
	for _, key := range keys {

		var keyDef string

		if key.New.Name != nil && *key.New.Name != "" {
			keyDef = fmt.Sprintf("CONSTRAINT %s ", quoteIdent(*key.New.Name))
		}

		keyType := ""
		if key.New.Type != nil {
			switch *key.New.Type {
			case "PRIMARY", "PRIMARY KEY":
				keyType = "PRIMARY KEY"
			case "UNIQUE":
				keyType = "UNIQUE"
			}
		}

		if keyType == "" {
			continue
		}

		keyDef += keyType

		if len(key.New.Columns) > 0 {
			q := make([]string, len(key.New.Columns))
			for i, c := range key.New.Columns {
				q[i] = quoteIdent(c)
			}
			keyDef += " (" + strings.Join(q, ", ") + ")"
		}

		keyDefs = append(keyDefs, keyDef)

	}

	if len(keyDefs) == 0 {
		return ""
	}

	result := ""
	for i, def := range keyDefs {
		if i > 0 {
			result += ", "
		}
		result += def
	}

	return result
}

func (r *SQLiteRepository) buildCreateIndexesQueries(tableName string, indexes []dto.SQLiteIndex) []string {
	if len(indexes) == 0 {
		return nil
	}

	var queries []string
	for _, idx := range indexes {
		if idx.New == nil {
			continue
		}
		if idx.Added != nil && !*idx.Added {
			continue
		}
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
		query := fmt.Sprintf("CREATE %sINDEX %s ON %s (%s)", unique, quoteIdent(name), quoteIdent(tableName), strings.Join(cols, ", "))
		queries = append(queries, query)
	}
	return queries
}

func (r *SQLiteRepository) buildEditIndexesQueries(tableName string, indexes []dto.SQLiteIndex) []string {
	if len(indexes) == 0 {
		return nil
	}

	var queries []string
	for _, idx := range indexes {
		if idx.Deleted != nil && *idx.Deleted && idx.Old != nil && idx.Old.Name != nil {
			queries = append(queries, fmt.Sprintf("DROP INDEX IF EXISTS %s", quoteIdent(*idx.Old.Name)))
			continue
		}

		if idx.Added != nil && *idx.Added {
			queries = append(queries, r.buildCreateIndexesQueries(tableName, []dto.SQLiteIndex{idx})...)
			continue
		}

		if idx.New != nil && idx.Old != nil && idx.New.Name != nil && idx.Old.Name != nil && *idx.New.Name != *idx.Old.Name {
			// SQLite safe path: DROP+CREATE
			queries = append(queries, fmt.Sprintf("DROP INDEX IF EXISTS %s", quoteIdent(*idx.Old.Name)))
			queries = append(queries, r.buildCreateIndexesQueries(tableName, []dto.SQLiteIndex{idx})...)
			continue
		}
	}
	return queries
}

// quoteIdent wraps an identifier with double quotes to avoid conflicts with reserved words or special chars
func quoteIdent(name string) string {
	if name == "" {
		return name
	}
	return "\"" + strings.ReplaceAll(name, "\"", "") + "\""
}

// splitTopLevelComma splits a DDL inner segment by commas at depth 0 (ignoring commas inside parentheses)
func splitTopLevelComma(s string) []string {
	var parts []string
	depth := 0
	start := 0
	for i, ch := range s {
		switch ch {
		case '(':
			depth++
		case ')':
			if depth > 0 {
				depth--
			}
		case ',':
			if depth == 0 {
				parts = append(parts, strings.TrimSpace(s[start:i]))
				start = i + 1
			}
		}
	}
	if start < len(s) {
		parts = append(parts, strings.TrimSpace(s[start:]))
	}
	return parts
}

// extractConstraintsFromCreateSQL returns only constraint items (PRIMARY/UNIQUE/FOREIGN/CONSTRAINT ...) from CREATE TABLE
func extractConstraintsFromCreateSQL(createSQL string) string {
	ddl := strings.TrimSpace(createSQL)
	open := strings.Index(ddl, "(")
	close := strings.LastIndex(ddl, ")")
	if open < 0 || close <= open {
		return ""
	}
	inner := ddl[open+1 : close]
	items := splitTopLevelComma(inner)
	selected := make([]string, 0)
	for _, it := range items {
		up := strings.ToUpper(strings.TrimSpace(it))
		// Only include table-level constraints; skip column definitions that may contain inline constraints
		if strings.HasPrefix(up, "CONSTRAINT ") ||
			strings.HasPrefix(up, "PRIMARY KEY") ||
			strings.HasPrefix(up, "FOREIGN KEY") ||
			strings.HasPrefix(up, "UNIQUE") ||
			strings.HasPrefix(up, "CHECK ") {
			selected = append(selected, strings.TrimSpace(it))
		}
	}
	return strings.Join(selected, ", ")
}

// extractColumnDefsFromDDL parses a CREATE TABLE DDL (original ddl text)
// and returns top-level full column definitions (skipping table-level constraints)
func extractColumnDefsFromDDL(createSQL string) []string {
	ddl := strings.TrimSpace(createSQL)
	if ddl == "" {
		return nil
	}
	open := strings.Index(ddl, "(")
	close := strings.LastIndex(ddl, ")")
	inner := ddl
	if open >= 0 && close > open {
		inner = ddl[open+1 : close]
	}
	items := splitTopLevelComma(inner)
	cols := make([]string, 0, len(items))
	for _, it := range items {
		part := strings.TrimSpace(it)
		if part == "" {
			continue
		}
		up := strings.ToUpper(part)
		if strings.HasPrefix(up, "CONSTRAINT ") ||
			strings.HasPrefix(up, "PRIMARY KEY") ||
			strings.HasPrefix(up, "FOREIGN KEY") ||
			strings.HasPrefix(up, "UNIQUE") ||
			strings.HasPrefix(up, "CHECK ") {
			continue
		}
		cols = append(cols, part)
	}
	return cols
}
