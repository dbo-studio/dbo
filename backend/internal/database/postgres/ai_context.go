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
		tableList, err := r.tables(nil, true)
		if err != nil {
			return "", err
		}
		req.ContextOpts.Tables = lo.Map(tableList, func(table Table, _ int) string {
			return table.Name
		})
	}

	if len(req.ContextOpts.Views) == 0 {
		viewList, err := r.views(nil, nil, true)
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

		columns, err := r.columns(&table, req.ContextOpts.Schema, []string{}, false, true)
		if err != nil {
			return "", err
		}

		primaryKeys, err := r.primaryKeys(&table, true)
		if err != nil {
			return "", err
		}

		contextTables := make(map[string]bool)
		for _, t := range req.ContextOpts.Tables {
			contextTables[t] = true
		}

		for _, column := range columns {
			sb.WriteString("   - ")
			sb.WriteString(column.ColumnName)
			sb.WriteString(" (")
			sb.WriteString(columnContextDescriptor(column))
			sb.WriteString(")\n")
		}

		if len(primaryKeys) > 1 {
			primaryKeysList := lo.Map(primaryKeys, func(pk PrimaryKey, _ int) string {
				return pk.ColumnName
			})

			sb.WriteString("   - PRIMARY KEY (")
			sb.WriteString(strings.Join(primaryKeysList, ", "))
			sb.WriteString(")\n")
		}

		sb.WriteString("\n")
		tableCounter++
	}

	if len(req.ContextOpts.Views) > 0 {
		sb.WriteString("\nViews:\n")

		viewCounter := 1
		for _, view := range req.ContextOpts.Views {
			sb.WriteString(fmt.Sprintf("%d. %s\n", viewCounter, view))

			columns, err := r.columns(&view, req.ContextOpts.Schema, []string{}, false, true)
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

/*
this is a sample of the AI complete context
Database: default
Schema: public

Tables:
1. data_src
  - datasrc_id (PK, character(6))
  - authors (character varying(256))
  - title (character varying)
  - year (integer)
  - journal (text)
  - vol_city (text)
  - issue_state (text)
  - start_page (text)
  - end_page (text)
*/
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

		columns, err := r.columns(&table, req.ContextOpts.Schema, []string{}, false, true)
		if err != nil {
			return ""
		}

		primaryKeys, err := r.primaryKeys(&table, true)
		if err != nil {
			return ""
		}

		contextTables := make(map[string]bool)
		for _, t := range sqlResult.Tables {
			contextTables[t] = true
		}

		for _, column := range columns {
			contextBuilder.WriteString("   - ")
			contextBuilder.WriteString(column.ColumnName)
			contextBuilder.WriteString(" (")
			contextBuilder.WriteString(columnContextDescriptor(column))
			contextBuilder.WriteString(")\n")
		}

		if len(primaryKeys) > 1 {
			primaryKeysList := lo.Map(primaryKeys, func(pk PrimaryKey, _ int) string {
				return pk.ColumnName
			})

			contextBuilder.WriteString("   - PRIMARY KEY (")
			contextBuilder.WriteString(strings.Join(primaryKeysList, ", "))
			contextBuilder.WriteString(")\n")
		}

		contextBuilder.WriteString("\n")
		tableCounter++
	}

	if len(sqlResult.Views) > 0 {
		contextBuilder.WriteString("\nViews:\n")

		viewCounter := 1
		for _, view := range sqlResult.Views {
			contextBuilder.WriteString(fmt.Sprintf("%d. %s\n", viewCounter, view))

			columns, err := r.columns(&view, sqlResult.Schema, []string{}, false, true)
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

func columnContextDescriptor(column Column) string {
	descriptors := make([]string, 0, 3)

	if column.PrimaryKey != nil {
		descriptors = append(descriptors, "PK")
	}

	if column.ForeignKey != nil {
		fk := column.ForeignKey
		refColumn := fk.RefColumns

		if len(fk.RefColumnsList) > 0 {
			refColumn = fk.RefColumnsList[0]
		}

		if len(fk.ColumnsList) == len(fk.RefColumnsList) {
			if idx := slices.Index(fk.ColumnsList, column.ColumnName); idx >= 0 {
				refColumn = fk.RefColumnsList[idx]
			}
		}

		descriptors = append(descriptors, fmt.Sprintf("FK → %s.%s", fk.TargetTable, refColumn))
	}

	descriptors = append(descriptors, columnTypeForContext(column))

	return strings.Join(descriptors, ", ")
}

func columnTypeForContext(column Column) string {
	dataType := strings.TrimSpace(column.DataType)
	if dataType != "" {
		return dataType
	}

	return column.MappedType
}
