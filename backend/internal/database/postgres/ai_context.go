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

		columns, err := r.getColumns(table, lo.FromPtr(req.ContextOpts.Schema), []string{}, false)
		if err != nil {
			return "", err
		}

		primaryKeys, err := r.getPrimaryKeys(Table{Name: table})
		if err != nil {
			return "", err
		}

		foreignKeys, err := r.getForeignKeys(table, lo.FromPtr(req.ContextOpts.Schema))
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

	return sb.String(), nil
}
