package databaseCore

import (
	"context"
	"fmt"
	"slices"
	"strings"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"golang.org/x/sync/errgroup"
)

func BuildAIChatContext(ctx context.Context, opts databaseContract.AIContextOptions, provider databaseContract.AIContextColumnProvider) (string, error) {
	var sb strings.Builder

	if valueFromPtr(opts.Database) != "" {
		sb.WriteString("Database: ")
		sb.WriteString(*opts.Database)
		sb.WriteString("\n")
	}

	if valueFromPtr(opts.Schema) != "" {
		sb.WriteString("Schema: ")
		sb.WriteString(*opts.Schema)
		sb.WriteString("\n")
	}

	// A large schema is listed by name only: picking some tables to describe would hide the rest.
	if len(opts.Tables) > maxAIContextObjects || len(opts.Views) > maxAIContextObjects {
		writeNameList(&sb, "Tables", opts.Tables)
		writeNameList(&sb, "Views", opts.Views)
		sb.WriteString("\nOnly names are listed because the schema is large: call describe_table for the columns of the tables you need.\n")

		return sb.String(), nil
	}

	sb.WriteString("\nTables:\n")

	tables := slices.Clone(opts.Tables)
	views := slices.Clone(opts.Views)

	tableSections, err := buildSections(ctx, tables, func(ctx context.Context, name string) ([]databaseContract.AIContextColumn, error) {
		return provider.TableColumns(ctx, name, opts)
	})
	if err != nil {
		return "", err
	}

	for _, section := range tableSections {
		sb.WriteString(section)
	}

	if len(views) > 0 {
		sb.WriteString("\nViews:\n")

		viewSections, err := buildViewSections(ctx, views, func(ctx context.Context, name string) ([]databaseContract.AIContextColumn, error) {
			return provider.ViewColumns(ctx, name, opts)
		})
		if err != nil {
			return "", err
		}

		for _, section := range viewSections {
			sb.WriteString(section)
		}
	}

	return sb.String(), nil
}

// maxAIContextObjects is how many tables or views the chat context describes column by column.
const maxAIContextObjects = 25

// maxAIContextNames caps the names-only listing of a very large schema.
const maxAIContextNames = 500

func writeNameList(sb *strings.Builder, title string, names []string) {
	if len(names) == 0 {
		return
	}

	shown := names
	if len(shown) > maxAIContextNames {
		shown = shown[:maxAIContextNames]
	}

	fmt.Fprintf(sb, "\n%s (%d):\n%s\n", title, len(names), strings.Join(shown, ", "))

	if len(shown) < len(names) {
		fmt.Fprintf(sb, "…and %d more; call list_tables or list_views for the rest.\n", len(names)-len(shown))
	}
}

func BuildAICompleteContext(ctx context.Context, opts databaseContract.AIContextOptions, provider databaseContract.AIContextColumnProvider) (string, error) {
	var sb strings.Builder

	if valueFromPtr(opts.Database) != "" {
		sb.WriteString("Database: ")
		sb.WriteString(*opts.Database)
		sb.WriteString("\n")
	}

	if valueFromPtr(opts.Schema) != "" {
		sb.WriteString("Schema: ")
		sb.WriteString(*opts.Schema)
		sb.WriteString("\n")
	}

	if len(opts.Tables) > 0 {
		sb.WriteString("Tables: ")
		sb.WriteString(strings.Join(opts.Tables, ", "))
		sb.WriteString("\n")
	}

	tableSections, err := buildSections(ctx, opts.Tables, func(ctx context.Context, name string) ([]databaseContract.AIContextColumn, error) {
		return provider.TableColumns(ctx, name, opts)
	})
	if err != nil {
		return "", err
	}

	for _, section := range tableSections {
		sb.WriteString(section)
	}

	if len(opts.Views) > 0 {
		sb.WriteString("\nViews:\n")

		viewSections, err := buildViewSections(ctx, opts.Views, func(ctx context.Context, name string) ([]databaseContract.AIContextColumn, error) {
			return provider.ViewColumns(ctx, name, opts)
		})
		if err != nil {
			return "", err
		}

		for _, section := range viewSections {
			sb.WriteString(section)
		}
	}

	return sb.String(), nil
}

func buildSections(ctx context.Context, names []string, fetchColumns func(ctx context.Context, name string) ([]databaseContract.AIContextColumn, error)) ([]string, error) {
	sections := make([]string, len(names))
	g, groupCtx := errgroup.WithContext(ctx)
	g.SetLimit(6)

	for idx, name := range names {
		g.Go(func() error {
			columns, err := fetchColumns(groupCtx, name)
			if err != nil {
				return err
			}

			var sectionBuilder strings.Builder
			fmt.Fprintf(&sectionBuilder, "%d. %s\n", idx+1, name)

			pkSet := make(map[string]struct{})
			pkList := make([]string, 0)

			for _, column := range columns {
				sectionBuilder.WriteString("   - ")
				sectionBuilder.WriteString(column.Name)
				sectionBuilder.WriteString(" (")
				sectionBuilder.WriteString(columnContextDescriptor(column))
				sectionBuilder.WriteString(")\n")

				if column.IsPrimaryKey {
					if _, exists := pkSet[column.Name]; !exists {
						pkSet[column.Name] = struct{}{}
						pkList = append(pkList, column.Name)
					}
				}
			}

			if len(pkList) > 1 {
				sectionBuilder.WriteString("   - PRIMARY KEY (")
				sectionBuilder.WriteString(strings.Join(pkList, ", "))
				sectionBuilder.WriteString(")\n")
			}

			sectionBuilder.WriteString("\n")
			sections[idx] = sectionBuilder.String()

			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return sections, nil
}

func buildViewSections(ctx context.Context, names []string, fetchColumns func(ctx context.Context, name string) ([]databaseContract.AIContextColumn, error)) ([]string, error) {
	sections := make([]string, len(names))
	g, groupCtx := errgroup.WithContext(ctx)
	g.SetLimit(6)

	for idx, name := range names {
		g.Go(func() error {
			columns, err := fetchColumns(groupCtx, name)
			if err != nil {
				return err
			}

			var sectionBuilder strings.Builder
			fmt.Fprintf(&sectionBuilder, "%d. %s\n", idx+1, name)

			for _, column := range columns {
				sectionBuilder.WriteString("   - ")
				sectionBuilder.WriteString(column.Name)
				sectionBuilder.WriteString(" (")
				sectionBuilder.WriteString(column.MappedType)
				sectionBuilder.WriteString(")\n")
			}

			sectionBuilder.WriteString("\n")
			sections[idx] = sectionBuilder.String()

			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return sections, nil
}

func columnContextDescriptor(column databaseContract.AIContextColumn) string {
	descriptors := make([]string, 0, 3)
	if column.IsPrimaryKey {
		descriptors = append(descriptors, "PK")
	}

	if column.ForeignKey != nil {
		fk := column.ForeignKey

		refColumn := fk.RefColumn
		if len(fk.RefColumns) > 0 {
			refColumn = fk.RefColumns[0]
		}

		if len(fk.Columns) == len(fk.RefColumns) {
			if idx := slices.Index(fk.Columns, column.Name); idx >= 0 {
				refColumn = fk.RefColumns[idx]
			}
		}

		descriptors = append(descriptors, fmt.Sprintf("FK → %s.%s", fk.TargetTable, refColumn))
	}

	descriptors = append(descriptors, columnTypeForContext(column))

	return strings.Join(descriptors, ", ")
}

func columnTypeForContext(column databaseContract.AIContextColumn) string {
	dataType := strings.TrimSpace(column.DataType)
	if dataType != "" {
		return dataType
	}

	return column.MappedType
}

func valueFromPtr(value *string) string {
	if value == nil {
		return ""
	}

	return strings.TrimSpace(*value)
}
