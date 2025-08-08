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
		treeTab == contract.TableKeysTab

	if !isTableRelatedTab && action != contract.DropTableAction {
		return queries, nil
	}

	if action == contract.CreateTableAction {
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

		tableParams := tableParamsDto[contract.TableTab]
		columnParams := columnParamsDto[contract.TableColumnsTab]
		foreignKeyParams := foreignKeyParamsDto[contract.TableForeignKeysTab]
		keyParams := keyParamsDto[contract.TableKeysTab]

		if tableParams == nil || tableParams.New == nil || tableParams.New.Name == nil {
			return nil, fmt.Errorf("table name is required")
		}

		tableName = *tableParams.New.Name

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

		query := r.buildCreateTableQuery(tableName, tableParams.New, columnDefs)
		queries = append(queries, query)
	}

	if action == contract.EditTableAction {
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

		tableParams := tableParamsDto[contract.TableTab]
		columnParams := columnParamsDto[contract.TableColumnsTab]
		foreignKeyParams := foreignKeyParamsDto[contract.TableForeignKeysTab]
		keyParams := keyParamsDto[contract.TableKeysTab]

		if tableParams == nil || tableParams.Old == nil || tableParams.Old.Name == nil {
			return nil, fmt.Errorf("table names are required")
		}

		oldName := *tableParams.Old.Name
		newName := *tableParams.New.Name

		if tableParams.New.Name == nil {
			newName = oldName
		}

		columnDefs := ""
		columnNames := ""

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

			for i, col := range columnParams.Columns {
				if i > 0 {
					columnDefs += ", "
					columnNames += ", "
				}
				columnDefs += fmt.Sprintf("%s %s", *col.New.Name, *col.New.DataType)
				columnNames += *col.New.Name
			}

		} else {
			columns, err := r.getColumns(oldName, nil, false)
			if err != nil {
				return nil, err
			}

			for i, col := range columns {
				if i > 0 {
					columnDefs += ", "
					columnNames += ", "
				}
				columnDefs += fmt.Sprintf("%s %s", col.ColumnName, col.DataType)
				columnNames += col.ColumnName
			}
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

		createTableQuery := r.buildCreateTableQuery(newName, tableParams.New, columnDefs)
		queries = append(queries, createTableQuery)

		insertQuery := fmt.Sprintf("INSERT INTO %s(%s) SELECT %s FROM %s", newName, columnNames, columnNames, oldName)
		queries = append(queries, insertQuery)

		dropQuery := fmt.Sprintf("DROP TABLE %s", oldName)
		queries = append(queries, dropQuery)

		renameQuery := fmt.Sprintf("ALTER TABLE %s RENAME TO %s", newName, oldName)
		queries = append(queries, renameQuery)
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

		columnDef := fmt.Sprintf("%s %s", *col.New.Name, *col.New.DataType)

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
			constraintDef = fmt.Sprintf("CONSTRAINT %s ", *fk.New.ConstraintName)
		}

		constraintDef += "FOREIGN KEY ("
		if len(fk.New.SourceColumns) > 0 {
			constraintDef += strings.Join(fk.New.SourceColumns, ", ")
		}
		constraintDef += ") REFERENCES "

		if fk.New.TargetTable != nil {
			constraintDef += *fk.New.TargetTable
		}

		if len(fk.New.TargetColumns) > 0 {
			constraintDef += " (" + strings.Join(fk.New.TargetColumns, ", ") + ")"
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
			keyDef = fmt.Sprintf("CONSTRAINT %s ", *key.New.Name)
		}

		keyType := ""
		if key.New.Type != nil {
			switch *key.New.Type {
			case "PRIMARY":
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
			keyDef += " (" + strings.Join(key.New.Columns, ", ") + ")"
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
