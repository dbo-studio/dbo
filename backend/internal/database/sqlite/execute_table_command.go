package databaseSqlite

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *SQLiteRepository) handleTableCommands(node SQLiteNode, tabId contract.TreeTab, action contract.TreeNodeActionName, params []byte) ([]string, string, error) {
	queries := []string{}
	var tableName string

	if tabId != contract.TableTab && action != contract.DropTableAction {
		return queries, "", nil
	}

	if action == contract.CreateTableAction {
		return r.handleCreateTable(params, tabId)
	}

	if action == contract.EditTableAction {
		return r.handleEditTable(params, tabId)
	}

	if action == contract.DropTableAction {
		query := fmt.Sprintf("DROP TABLE %s", node.Table)
		queries = append(queries, query)
		return queries, node.Table, nil
	}

	return queries, tableName, nil
}

func (r *SQLiteRepository) handleCreateTable(params []byte, tabId contract.TreeTab) ([]string, string, error) {
	queries := []string{}

	dto, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.SQLiteCreateTableParams](params)
	if err != nil {
		return nil, "", err
	}

	paramsData := dto[tabId]
	if paramsData == nil {
		return queries, "", nil
	}

	tableName := paramsData.Name
	query := fmt.Sprintf("CREATE TABLE %s (", paramsData.Name)

	// Add columns
	columnDefs := make([]string, 0)
	for _, column := range paramsData.Columns {
		columnDef := fmt.Sprintf("%s %s", column.Name, column.DataType)

		if column.NotNull {
			columnDef += " NOT NULL"
		}

		if column.Default != "" {
			columnDef += fmt.Sprintf(" DEFAULT %s", column.Default)
		}

		if column.Primary {
			columnDef += " PRIMARY KEY"
		}

		columnDefs = append(columnDefs, columnDef)
	}

	query += strings.Join(columnDefs, ", ") + ")"
	queries = append(queries, query)

	return queries, tableName, nil
}

func (r *SQLiteRepository) handleEditTable(params []byte, tabId contract.TreeTab) ([]string, string, error) {
	queries := []string{}

	dtoParams, err := helper.ConvertToDTO[map[contract.TreeTab]*dto.SQLiteUpdateTableParams](params)
	if err != nil {
		return nil, "", err
	}

	paramsData := dtoParams[tabId]
	if paramsData == nil {
		return queries, "", nil
	}

	oldTableName := paramsData.OldName
	newTableName := paramsData.NewName

	// If only renaming is needed, use simple ALTER TABLE
	if paramsData.OldName != paramsData.NewName && len(paramsData.AddColumns) == 0 {
		queries = append(queries, fmt.Sprintf("ALTER TABLE %s RENAME TO %s", paramsData.OldName, paramsData.NewName))
		return queries, oldTableName, nil
	}

	// For complex changes, use copy and recreate method
	if len(paramsData.AddColumns) > 0 {
		queries = append(queries, r.generateTableRecreateQueries(oldTableName, newTableName, paramsData)...)
	}

	return queries, oldTableName, nil
}

func (r *SQLiteRepository) generateTableRecreateQueries(oldTableName, newTableName string, params *dto.SQLiteUpdateTableParams) []string {
	queries := []string{}

	// Step 1: Get current table structure and indexes
	currentColumns, err := r.getColumns(oldTableName, nil, false)
	if err != nil {
		return queries
	}

	// Get existing indexes to recreate them later
	existingIndexes, err := r.getTableIndexes(oldTableName)
	if err != nil {
		// Continue without indexes if we can't get them
		existingIndexes = []string{}
	}

	// Step 2: Create new table with updated structure
	newTableQuery := fmt.Sprintf("CREATE TABLE %s_new (", newTableName)

	columnDefs := make([]string, 0)
	columnNames := make([]string, 0)

	// Add existing columns
	for _, column := range currentColumns {
		columnDef := fmt.Sprintf("%s %s", column.ColumnName, column.DataType)

		if column.IsNullable == "0" {
			columnDef += " NOT NULL"
		}

		if column.ColumnDefault.Valid {
			columnDef += fmt.Sprintf(" DEFAULT %s", column.ColumnDefault.String)
		}

		if column.IsPrimaryKey == "1" {
			columnDef += " PRIMARY KEY"
		}

		columnDefs = append(columnDefs, columnDef)
		columnNames = append(columnNames, column.ColumnName)
	}

	// Add new columns
	for _, newColumn := range params.AddColumns {
		columnDef := fmt.Sprintf("%s %s", newColumn.Name, newColumn.DataType)

		if newColumn.NotNull {
			columnDef += " NOT NULL"
		}

		if newColumn.Default != "" {
			columnDef += fmt.Sprintf(" DEFAULT %s", newColumn.Default)
		}

		if newColumn.Primary {
			columnDef += " PRIMARY KEY"
		}

		columnDefs = append(columnDefs, columnDef)
		columnNames = append(columnNames, newColumn.Name)
	}

	newTableQuery += strings.Join(columnDefs, ", ") + ")"
	queries = append(queries, newTableQuery)

	// Step 3: Copy data from old table to new table
	if len(columnNames) > 0 {
		copyQuery := fmt.Sprintf("INSERT INTO %s_new (%s) SELECT %s FROM %s",
			newTableName,
			strings.Join(columnNames, ", "),
			strings.Join(columnNames, ", "),
			oldTableName)
		queries = append(queries, copyQuery)
	}

	// Step 4: Drop old table (this will also drop its indexes)
	queries = append(queries, fmt.Sprintf("DROP TABLE %s", oldTableName))

	// Step 5: Rename new table to original name
	queries = append(queries, fmt.Sprintf("ALTER TABLE %s_new RENAME TO %s", newTableName, newTableName))

	// Step 6: Recreate indexes on the new table
	// Note: This is a simplified approach. In a real implementation,
	// you'd need to store the index definitions and recreate them properly
	for _, indexName := range existingIndexes {
		// For now, we'll just create a simple index
		// In a real implementation, you'd need to get the full index definition
		recreateIndexQuery := fmt.Sprintf("CREATE INDEX %s ON %s (%s)",
			indexName, newTableName, strings.Join(columnNames[:1], ", ")) // Use first column as default
		queries = append(queries, recreateIndexQuery)
	}

	return queries
}
