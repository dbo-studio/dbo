package databaseSqlite

import (
	"context"
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
	"golang.org/x/sync/errgroup"
)

func (r *SQLiteRepository) AiContext(ctx context.Context, req *dto.AiChatRequest) (string, error) {
	var sb strings.Builder

	if req.ContextOpts == nil {
		return "", nil
	}

	sb.WriteString("\nTables:\n")

	if len(req.ContextOpts.Tables) == 0 {
		tableList, err := r.getAllTableList()
		if err != nil {
			return "", err
		}
		req.ContextOpts.Tables = lo.Map(tableList, func(table Table, _ int) string {
			return table.Name
		})
	}

	if len(req.ContextOpts.Views) == 0 {
		viewList, err := r.getAllViewList()
		if err != nil {
			return "", err
		}
		req.ContextOpts.Views = lo.Map(viewList, func(view ViewBasic, _ int) string {
			return view.Name
		})
	}

	tableSections := make([]string, len(req.ContextOpts.Tables))
	gTables, _ := errgroup.WithContext(ctx)

	for idx, table := range req.ContextOpts.Tables {
		idx := idx
		tableName := table

		gTables.Go(func() error {
			columns, err := r.getColumns(tableName, []string{}, false)
			if err != nil {
				return err
			}

			var sectionBuilder strings.Builder
			sectionBuilder.WriteString(fmt.Sprintf("%d. %s\n", idx+1, tableName))

			pkList := make([]string, 0)

			for _, column := range columns {
				sectionBuilder.WriteString("   - ")
				sectionBuilder.WriteString(column.ColumnName)
				sectionBuilder.WriteString(" (")
				sectionBuilder.WriteString(columnContextDescriptor(column))
				sectionBuilder.WriteString(")\n")

				if column.IsPrimaryKey == "1" {
					pkList = append(pkList, column.ColumnName)
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
		gViews, _ := errgroup.WithContext(ctx)

		for idx, view := range req.ContextOpts.Views {
			idx := idx
			viewName := view

			gViews.Go(func() error {
				columns, err := r.getColumns(viewName, []string{}, false)
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

func (r *SQLiteRepository) AiCompleteContext(ctx context.Context, req *dto.AiInlineCompleteRequest) string {
	var contextBuilder strings.Builder

	if req.ContextOpts.Database != nil {
		contextBuilder.WriteString("Database: " + *req.ContextOpts.Database)
		contextBuilder.WriteString("\n")
	}

	if req.ContextOpts.Prompt != "" {
		contextBuilder.WriteString("Prompt: " + req.ContextOpts.Prompt)
		contextBuilder.WriteString("\n")
	}

	return contextBuilder.String()
}

func columnContextDescriptor(column Column) string {
	descriptors := make([]string, 0, 2)

	if column.IsPrimaryKey == "1" {
		descriptors = append(descriptors, "PK")
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

