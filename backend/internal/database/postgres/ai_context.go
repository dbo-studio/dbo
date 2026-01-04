package databasePostgres

import (
	"context"
	"fmt"
	"slices"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
	"golang.org/x/sync/errgroup"
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
func (r *PostgresRepository) AiContext(ctx context.Context, req *dto.AiChatRequest) (string, error) {
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
		tableList, err := r.tables(ctx, nil, true)
		if err != nil {
			return "", err
		}
		req.ContextOpts.Tables = lo.Map(tableList, func(table Table, _ int) string {
			return table.Name
		})
	}

	if len(req.ContextOpts.Views) == 0 {
		viewList, err := r.views(ctx, nil, nil, true)
		if err != nil {
			return "", err
		}
		req.ContextOpts.Views = lo.Map(viewList, func(view View, _ int) string {
			return view.Name
		})
	}

	tableSections := make([]string, len(req.ContextOpts.Tables))
	gTables, gTablesCtx := errgroup.WithContext(ctx)

	for idx, table := range req.ContextOpts.Tables {
		idx := idx
		tableName := table

		gTables.Go(func() error {
			columns, err := r.columns(gTablesCtx, &tableName, req.ContextOpts.Schema, []string{}, false, true)
			if err != nil {
				return err
			}

			var sectionBuilder strings.Builder
			sectionBuilder.WriteString(fmt.Sprintf("%d. %s\n", idx+1, tableName))

			pkSet := make(map[string]struct{})
			pkList := make([]string, 0)

			for _, column := range columns {
				sectionBuilder.WriteString("   - ")
				sectionBuilder.WriteString(column.ColumnName)
				sectionBuilder.WriteString(" (")
				sectionBuilder.WriteString(columnContextDescriptor(column))
				sectionBuilder.WriteString(")\n")

				if column.PrimaryKey != nil {
					if _, exists := pkSet[column.ColumnName]; !exists {
						pkSet[column.ColumnName] = struct{}{}
						pkList = append(pkList, column.ColumnName)
					}
				}
			}

			if len(pkList) > 1 {
				sectionBuilder.WriteString("   - PRIMARY KEY (")
				sectionBuilder.WriteString(strings.Join(pkList, ", "))
				sectionBuilder.WriteString(")\n")
			}

			sectionBuilder.WriteString("\n")
			tableSections[idx] = sectionBuilder.String()
			return nil
		})
	}

	if err := gTables.Wait(); err != nil {
		return "", err
	}

	for _, section := range tableSections {
		sb.WriteString(section)
	}

	if len(req.ContextOpts.Views) > 0 {
		sb.WriteString("\nViews:\n")

		viewSections := make([]string, len(req.ContextOpts.Views))
		gViews, gViewsCtx := errgroup.WithContext(ctx)

		for idx, view := range req.ContextOpts.Views {
			idx := idx
			viewName := view

			gViews.Go(func() error {
				columns, err := r.columns(gViewsCtx, &viewName, req.ContextOpts.Schema, []string{}, false, true)
				if err != nil {
					return err
				}

				var sectionBuilder strings.Builder
				sectionBuilder.WriteString(fmt.Sprintf("%d. %s\n", idx+1, viewName))

				for _, column := range columns {
					sectionBuilder.WriteString("   - ")
					sectionBuilder.WriteString(column.ColumnName)
					sectionBuilder.WriteString(" (")
					sectionBuilder.WriteString(column.MappedType)
					sectionBuilder.WriteString(")\n")
				}

				sectionBuilder.WriteString("\n")
				viewSections[idx] = sectionBuilder.String()
				return nil
			})
		}

		if err := gViews.Wait(); err != nil {
			return "", err
		}

		for _, section := range viewSections {
			sb.WriteString(section)
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
func (r *PostgresRepository) AiCompleteContext(ctx context.Context, req *dto.AiInlineCompleteRequest) string {
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

	tableSections := make([]string, len(sqlResult.Tables))
	gTables, gTablesCtx := errgroup.WithContext(ctx)

	for idx, table := range sqlResult.Tables {
		idx := idx
		tableName := table

		gTables.Go(func() error {
			columns, err := r.columns(gTablesCtx, &tableName, req.ContextOpts.Schema, []string{}, false, true)
			if err != nil {
				return err
			}

			var sectionBuilder strings.Builder
			sectionBuilder.WriteString(fmt.Sprintf("%d. %s\n", idx+1, tableName))

			pkSet := make(map[string]struct{})
			pkList := make([]string, 0)

			for _, column := range columns {
				sectionBuilder.WriteString("   - ")
				sectionBuilder.WriteString(column.ColumnName)
				sectionBuilder.WriteString(" (")
				sectionBuilder.WriteString(columnContextDescriptor(column))
				sectionBuilder.WriteString(")\n")

				if column.PrimaryKey != nil {
					if _, exists := pkSet[column.ColumnName]; !exists {
						pkSet[column.ColumnName] = struct{}{}
						pkList = append(pkList, column.ColumnName)
					}
				}
			}

			if len(pkList) > 1 {
				sectionBuilder.WriteString("   - PRIMARY KEY (")
				sectionBuilder.WriteString(strings.Join(pkList, ", "))
				sectionBuilder.WriteString(")\n")
			}

			sectionBuilder.WriteString("\n")
			tableSections[idx] = sectionBuilder.String()
			return nil
		})
	}

	if err := gTables.Wait(); err != nil {
		return ""
	}

	for _, section := range tableSections {
		contextBuilder.WriteString(section)
	}

	if len(sqlResult.Views) > 0 {
		contextBuilder.WriteString("\nViews:\n")

		viewSections := make([]string, len(sqlResult.Views))
		gViews, gViewsCtx := errgroup.WithContext(ctx)

		for idx, view := range sqlResult.Views {
			idx := idx
			viewName := view

			gViews.Go(func() error {
				columns, err := r.columns(gViewsCtx, &viewName, sqlResult.Schema, []string{}, false, true)
				if err != nil {
					return err
				}

				var sectionBuilder strings.Builder
				sectionBuilder.WriteString(fmt.Sprintf("%d. %s\n", idx+1, viewName))

				for _, column := range columns {
					sectionBuilder.WriteString("   - ")
					sectionBuilder.WriteString(column.ColumnName)
					sectionBuilder.WriteString(" (")
					sectionBuilder.WriteString(column.MappedType)
					sectionBuilder.WriteString(")\n")
				}

				sectionBuilder.WriteString("\n")
				viewSections[idx] = sectionBuilder.String()
				return nil
			})
		}

		if err := gViews.Wait(); err != nil {
			return ""
		}

		for _, section := range viewSections {
			contextBuilder.WriteString(section)
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
