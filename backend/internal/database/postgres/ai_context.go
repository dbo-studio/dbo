package databasePostgres

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

type ForeignKeyInfo struct {
	ReferencedTable  string
	ReferencedColumn string
}

/*
this is a sample of the AI context
Database: default
Schema: public

Tables:
1. data_src
  - datasrc_id (PK, character)
  - authors (character varying)
  - title (character varying)
  - year (integer)
  - journal (text)
  - vol_city (text)
  - issue_state (text)
  - start_page (text)
  - end_page (text)

2. datsrcln
  - ndb_no (PK, FK → nut_data.nutr_no, character)
  - nutr_no (PK, FK → nut_data.nutr_no, character)
  - datasrc_id (PK, FK → data_src.datasrc_id, character)
*/
func (r *PostgresRepository) AiContext(req *dto.AiChatRequest) (string, error) {
	var sb strings.Builder

	if req.ContextOpts == nil {
		return "", nil
	}

	if lo.FromPtr(req.ContextOpts.Database) != "" {
		sb.WriteString("Database: ")
		sb.WriteString(*req.ContextOpts.Database)
		sb.WriteString("\n")
	}

	if lo.FromPtr(req.ContextOpts.Schema) != "" {
		sb.WriteString("Schema: ")
		sb.WriteString(*req.ContextOpts.Schema)
		sb.WriteString("\n")
	}

	sb.WriteString("\nTables:\n")

	if len(req.ContextOpts.Tables) == 0 {
		tableList, err := r.getAllTableList(lo.ToPtr(true))
		if err != nil {
			return "", err
		}
		req.ContextOpts.Tables = lo.Map(tableList, func(table Table, _ int) string {
			return table.Name
		})
	}

	if len(req.ContextOpts.Views) == 0 {
		viewList, err := r.getAllViewList(lo.ToPtr(true))
		if err != nil {
			return "", err
		}
		req.ContextOpts.Views = lo.Map(viewList, func(view View, _ int) string {
			return view.Name
		})
	}

	tableCounter := 1
	for _, table := range req.ContextOpts.Tables {
		sb.WriteString(fmt.Sprintf("%d. %s\n", tableCounter, table))

		columns, err := r.getColumns(table, req.ContextOpts.Schema, []string{}, false)
		if err != nil {
			return "", err
		}

		primaryKeys, err := r.getPrimaryKeys(Table{Name: table})
		if err != nil {
			return "", err
		}

		foreignKeys, err := r.getForeignKeys(table, req.ContextOpts.Schema)
		if err != nil {
			return "", err
		}

		externalRefs := make(map[string]string)
		contextTables := make(map[string]bool)
		for _, t := range req.ContextOpts.Tables {
			contextTables[t] = true
		}

		for _, column := range columns {
			sb.WriteString("   - ")
			sb.WriteString(column.ColumnName)
			sb.WriteString(" (")

			if fkInfo, exists := foreignKeys[column.ColumnName]; exists {
				if contextTables[fkInfo.ReferencedTable] {
					sb.WriteString("FK → ")
					sb.WriteString(fkInfo.ReferencedTable)
					sb.WriteString(".")
					sb.WriteString(fkInfo.ReferencedColumn)
					sb.WriteString(", ")
				} else {
					externalRefs[column.ColumnName] = fmt.Sprintf("FK → %s.%s (external)", fkInfo.ReferencedTable, fkInfo.ReferencedColumn)
				}
			}

			sb.WriteString(column.MappedType)
			sb.WriteString(")\n")
		}

		if len(primaryKeys) > 1 {
			sb.WriteString("   - PRIMARY KEY (")
			sb.WriteString(strings.Join(primaryKeys, ", "))
			sb.WriteString(")\n")
		}

		if len(externalRefs) > 0 {
			sb.WriteString("   - External References:\n")
			for colName, ref := range externalRefs {
				sb.WriteString("     * ")
				sb.WriteString(colName)
				sb.WriteString(": ")
				sb.WriteString(ref)
				sb.WriteString("\n")
			}
		}

		sb.WriteString("\n")
		tableCounter++
	}

	if len(req.ContextOpts.Views) > 0 {
		sb.WriteString("\nViews:\n")

		viewCounter := 1
		for _, view := range req.ContextOpts.Views {
			sb.WriteString(fmt.Sprintf("%d. %s\n", viewCounter, view))

			columns, err := r.getColumns(view, req.ContextOpts.Schema, []string{}, false)
			if err != nil {
				return "", err
			}

			for _, column := range columns {
				sb.WriteString("   - ")
				sb.WriteString(column.ColumnName)
				sb.WriteString(" (")
				sb.WriteString(column.MappedType)
				sb.WriteString(")\n")
			}

			sb.WriteString("\n")
			viewCounter++
		}
	}

	return sb.String(), nil
}

func (r *PostgresRepository) AiCompleteContext(req *dto.AiInlineCompleteRequest) string {
	var contextBuilder strings.Builder

	sqlResult := r.parseSQL(req.ContextOpts.Prompt)

	if sqlResult.Database != nil {
		contextBuilder.WriteString("Database: " + *sqlResult.Database)
		contextBuilder.WriteString("\n")
	} else if req.ContextOpts.Database != nil {
		contextBuilder.WriteString("Database: " + *req.ContextOpts.Database)
		contextBuilder.WriteString("\n")
	}

	if sqlResult.Schema != nil {
		contextBuilder.WriteString("Schema: " + *sqlResult.Schema)
		contextBuilder.WriteString("\n")
	} else if req.ContextOpts.Schema != nil {
		contextBuilder.WriteString("Schema: " + *req.ContextOpts.Schema)
		contextBuilder.WriteString("\n")
	}

	if len(sqlResult.Tables) > 0 {
		contextBuilder.WriteString("Tables: " + strings.Join(sqlResult.Tables, ", "))
		contextBuilder.WriteString("\n")
	}

	tableCounter := 1
	for _, table := range sqlResult.Tables {
		contextBuilder.WriteString(fmt.Sprintf("%d. %s\n", tableCounter, table))

		columns, err := r.getColumns(table, req.ContextOpts.Schema, []string{}, false)
		if err != nil {
			return ""
		}

		primaryKeys, err := r.getPrimaryKeys(Table{Name: table})
		if err != nil {
			return ""
		}

		foreignKeys, err := r.getForeignKeys(table, req.ContextOpts.Schema)
		if err != nil {
			return ""
		}

		externalRefs := make(map[string]string)
		contextTables := make(map[string]bool)
		for _, t := range sqlResult.Tables {
			contextTables[t] = true
		}

		for _, column := range columns {
			contextBuilder.WriteString("   - ")
			contextBuilder.WriteString(column.ColumnName)
			contextBuilder.WriteString(" (")

			if fkInfo, exists := foreignKeys[column.ColumnName]; exists {
				if contextTables[fkInfo.ReferencedTable] {
					contextBuilder.WriteString("FK → ")
					contextBuilder.WriteString(fkInfo.ReferencedTable)
					contextBuilder.WriteString(".")
					contextBuilder.WriteString(fkInfo.ReferencedColumn)
					contextBuilder.WriteString(", ")
				} else {
					externalRefs[column.ColumnName] = fmt.Sprintf("FK → %s.%s (external)", fkInfo.ReferencedTable, fkInfo.ReferencedColumn)
				}
			}

			contextBuilder.WriteString(column.MappedType)
			contextBuilder.WriteString(")\n")
		}

		if len(primaryKeys) > 1 {
			contextBuilder.WriteString("   - PRIMARY KEY (")
			contextBuilder.WriteString(strings.Join(primaryKeys, ", "))
			contextBuilder.WriteString(")\n")
		}

		if len(externalRefs) > 0 {
			contextBuilder.WriteString("   - External References:\n")
			for colName, ref := range externalRefs {
				contextBuilder.WriteString("     * ")
				contextBuilder.WriteString(colName)
				contextBuilder.WriteString(": ")
				contextBuilder.WriteString(ref)
				contextBuilder.WriteString("\n")
			}
		}

		contextBuilder.WriteString("\n")
		tableCounter++
	}

	if len(sqlResult.Views) > 0 {
		contextBuilder.WriteString("\nViews:\n")

		viewCounter := 1
		for _, view := range sqlResult.Views {
			contextBuilder.WriteString(fmt.Sprintf("%d. %s\n", viewCounter, view))

			columns, err := r.getColumns(view, sqlResult.Schema, []string{}, false)
			if err != nil {
				return ""
			}

			for _, column := range columns {
				contextBuilder.WriteString("   - ")
				contextBuilder.WriteString(column.ColumnName)
				contextBuilder.WriteString(" (")
				contextBuilder.WriteString(column.MappedType)
				contextBuilder.WriteString(")\n")
			}

			contextBuilder.WriteString("\n")
			viewCounter++
		}
	}

	return contextBuilder.String()
}
