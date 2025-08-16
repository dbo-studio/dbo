package databasePostgres

import (
	"fmt"
	"slices"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

type ForeignKeyInfo struct {
	ReferencedTable  string
	ReferencedColumn string
}

func (r *PostgresRepository) AiContext(req *dto.AiChatRequest) (string, error) {
	var sb strings.Builder

	if req.ContextOpts == nil {
		return "", nil
	}

	if req.ContextOpts.Database != "" {
		sb.WriteString("Database: ")
		sb.WriteString(req.ContextOpts.Database)
		sb.WriteString("\n")
	}

	if req.ContextOpts.Schema != nil && *req.ContextOpts.Schema != "" {
		sb.WriteString("Schema: ")
		sb.WriteString(*req.ContextOpts.Schema)
		sb.WriteString("\n")
	}

	sb.WriteString("\nTables:\n")

	tableCounter := 1
	for _, table := range req.ContextOpts.Tables {
		sb.WriteString(fmt.Sprintf("%d. %s\n", tableCounter, table))

		// Get detailed column information using getColumns
		columns, err := r.getColumns(table, lo.FromPtr(req.ContextOpts.Schema), []string{}, false)
		if err != nil {
			return "", err
		}

		// Get primary keys for this table
		primaryKeys, err := r.getPrimaryKeys(Table{Name: table})
		if err != nil {
			return "", err
		}

		// Get foreign keys for this table
		foreignKeys, err := r.getForeignKeys(table, lo.FromPtr(req.ContextOpts.Schema))
		if err != nil {
			return "", err
		}

		// Display columns with their details
		for _, column := range columns {
			sb.WriteString("   - ")
			sb.WriteString(column.ColumnName)
			sb.WriteString(" (")

			// Check if it's a primary key
			if slices.Contains(primaryKeys, column.ColumnName) {
				sb.WriteString("PK, ")
			}

			// Check if it's a foreign key
			if fkInfo, exists := foreignKeys[column.ColumnName]; exists {
				sb.WriteString("FK → ")
				sb.WriteString(fkInfo.ReferencedTable)
				sb.WriteString(".")
				sb.WriteString(fkInfo.ReferencedColumn)
				sb.WriteString(", ")
			}

			sb.WriteString(column.DataType)
			sb.WriteString(")\n")
		}

		sb.WriteString("\n")
		tableCounter++
	}

	return sb.String(), nil
}

func (r *PostgresRepository) getForeignKeys(table string, schema string) (map[string]ForeignKeyInfo, error) {
	foreignKeys := make(map[string]ForeignKeyInfo)

	rows, err := r.db.Raw(`
		SELECT 
			kcu.column_name,
			ccu.table_name AS referenced_table,
			ccu.column_name AS referenced_column
		FROM information_schema.table_constraints AS tc
		JOIN information_schema.key_column_usage AS kcu
			ON tc.constraint_name = kcu.constraint_name
			AND tc.table_schema = kcu.table_schema
		JOIN information_schema.constraint_column_usage AS ccu
			ON ccu.constraint_name = tc.constraint_name
			AND ccu.table_schema = tc.table_schema
		WHERE tc.constraint_type = 'FOREIGN KEY'
			AND tc.table_name = ?
			AND tc.table_schema = ?
	`, table, schema).Rows()

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var columnName, referencedTable, referencedColumn string
		if err := rows.Scan(&columnName, &referencedTable, &referencedColumn); err != nil {
			return nil, err
		}
		foreignKeys[columnName] = ForeignKeyInfo{
			ReferencedTable:  referencedTable,
			ReferencedColumn: referencedColumn,
		}
	}

	return foreignKeys, nil
}
