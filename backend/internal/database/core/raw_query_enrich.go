package databaseCore

import (
	"context"
	"slices"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

type RawQueryTableResolver interface {
	IsBaseTable(ctx context.Context, database, schema *string, table string) (bool, error)
	LoadTableColumns(ctx context.Context, database, schema *string, table string) ([]dto.Column, error)
	BuildNodeID(ctx context.Context, database, schema, table string) string
}

func EnrichRawQueryResponse(
	ctx context.Context,
	req *dto.RawQueryRequest,
	resp *dto.RawQueryResponse,
	resolver RawQueryTableResolver,
) (*dto.RawQueryResponse, error) {
	if resp == nil || isRawQueryCommandResponse(resp) {
		return resp, nil
	}

	analysis := AnalyzeUpdatableQuery(req.Query, req.Database, req.Schema)

	reason := analysis.EditableReason()
	if reason != "" {
		resp.Editable = false
		resp.EditableReason = lo.ToPtr(reason)

		return resp, nil
	}

	targetTable := analysis.TargetTable()
	if targetTable == "" {
		resp.Editable = false
		resp.EditableReason = lo.ToPtr("Could not determine source table")

		return resp, nil
	}

	database := analysis.TargetDatabase(req.Database)
	schema := analysis.TargetSchema(req.Schema)
	dbPtr := stringPtr(database)
	schemaPtr := stringPtr(schema)

	isTable, err := resolver.IsBaseTable(ctx, dbPtr, schemaPtr, targetTable)
	if err != nil {
		resp.Editable = false
		resp.EditableReason = lo.ToPtr("Could not resolve table metadata")

		// Soft-fail: still return query results, just disable inline editing.
		return resp, nil //nolint:nilerr
	}

	if !isTable {
		resp.Editable = false
		resp.EditableReason = lo.ToPtr("Query results from views cannot be edited inline")

		return resp, nil
	}

	tableColumns, err := resolver.LoadTableColumns(ctx, dbPtr, schemaPtr, targetTable)
	if err != nil {
		resp.Editable = false
		resp.EditableReason = lo.ToPtr("Could not load table columns for inline editing")

		// Soft-fail: still return query results, just disable inline editing.
		return resp, nil //nolint:nilerr
	}

	resultColumnNames := lo.Map(resp.Columns, func(col dto.Column, _ int) string {
		return col.Name
	})

	enrichedColumns, editable, editableReason := mergeRawQueryColumns(
		resp.Columns,
		tableColumns,
		analysis,
		resultColumnNames,
	)

	if !editable {
		resp.Editable = false
		resp.EditableReason = lo.ToPtr(editableReason)
		resp.Columns = enrichedColumns

		return resp, nil
	}

	resp.Editable = true
	resp.NodeID = resolver.BuildNodeID(ctx, database, schema, targetTable)
	resp.DrivingTable = lo.ToPtr(targetTable)
	resp.Columns = enrichedColumns

	return resp, nil
}

func mergeRawQueryColumns(
	resultColumns []dto.Column,
	tableColumns []dto.Column,
	analysis UpdatableQueryAnalysis,
	resultColumnNames []string,
) ([]dto.Column, bool, string) {
	tableColumnByName := make(map[string]dto.Column, len(tableColumns))
	pkColumns := make([]dto.Column, 0)

	for _, column := range tableColumns {
		tableColumnByName[strings.ToLower(column.Name)] = column
		if column.IsPrimaryKey {
			pkColumns = append(pkColumns, column)
		}
	}

	hasStar := lo.SomeBy(analysis.SelectColumns, func(col SelectColumnRef) bool {
		return col.IsStar
	})

	pkPresent := false
	if hasStar {
		pkPresent = len(pkColumns) > 0
	} else {
		pkPresent = true

		for _, pk := range pkColumns {
			found := slices.Contains(resultColumnNames, pk.Name)
			if !found {
				for _, selectCol := range analysis.SelectColumns {
					if selectCol.SourceColumn == pk.Name && slices.Contains(resultColumnNames, selectCol.OutputName) {
						found = true
						break
					}
				}
			}

			if !found {
				pkPresent = false
				break
			}
		}
	}

	if len(pkColumns) == 0 {
		return enrichResultColumns(resultColumns, tableColumnByName, analysis, false), false, "Result set must include primary key columns"
	}

	if !pkPresent {
		return enrichResultColumns(resultColumns, tableColumnByName, analysis, false), false, "Result set must include primary key columns"
	}

	merged := enrichResultColumns(resultColumns, tableColumnByName, analysis, true)

	return merged, true, ""
}

func enrichResultColumns(
	resultColumns []dto.Column,
	tableColumnByName map[string]dto.Column,
	analysis UpdatableQueryAnalysis,
	gridEditable bool,
) []dto.Column {
	merged := make([]dto.Column, 0, len(resultColumns))

	for _, resultColumn := range resultColumns {
		sourceColumnName := resolveSourceColumnName(resultColumn.Name, analysis)
		tableColumn, ok := tableColumnByName[strings.ToLower(sourceColumnName)]

		column := resultColumn
		column.IsActive = true

		if ok {
			column.NotNull = tableColumn.NotNull
			column.Length = tableColumn.Length
			column.Default = tableColumn.Default
			column.Comment = tableColumn.Comment
			column.MappedType = tableColumn.MappedType
			column.IsPrimaryKey = tableColumn.IsPrimaryKey
			column.IsForeignKey = tableColumn.IsForeignKey
			column.ReferencedSchema = tableColumn.ReferencedSchema
			column.ReferencedTable = tableColumn.ReferencedTable
			column.ReferencedColumns = append([]string(nil), tableColumn.ReferencedColumns...)
			column.LocalColumns = append([]string(nil), tableColumn.LocalColumns...)

			column.EnumValues = tableColumn.EnumValues
			if sourceColumnName != "" {
				column.SourceColumn = lo.ToPtr(sourceColumnName)
			}

			column.SourceTable = lo.ToPtr(analysis.TargetTable())
		}

		columnEditable := gridEditable && analysis.IsColumnFromDrivingTable(resultColumn.Name) && sourceColumnName != "" && ok
		column.Editable = columnEditable

		if column.SourceTable == nil && sourceColumnName != "" {
			column.SourceTable = lo.ToPtr(analysis.TargetTable())
			column.SourceColumn = lo.ToPtr(sourceColumnName)
		}

		merged = append(merged, column)
	}

	return merged
}

func resolveSourceColumnName(outputName string, analysis UpdatableQueryAnalysis) string {
	for _, selectCol := range analysis.SelectColumns {
		if selectCol.OutputName == outputName && selectCol.SourceColumn != "" && selectCol.SourceColumn != "*" {
			return selectCol.SourceColumn
		}
	}

	if !analysis.HasJoin && len(analysis.Tables) == 1 {
		return outputName
	}

	return ""
}

func stringPtr(value string) *string {
	if value == "" {
		return nil
	}

	return lo.ToPtr(value)
}

func isRawQueryCommandResponse(resp *dto.RawQueryResponse) bool {
	if len(resp.Columns) != 3 || len(resp.Data) == 0 {
		return false
	}

	columnNames := make(map[string]struct{}, len(resp.Columns))
	for _, column := range resp.Columns {
		columnNames[column.Name] = struct{}{}
	}

	_, hasQuery := columnNames["Query"]
	_, hasMessage := columnNames["Message"]

	_, hasDuration := columnNames["Duration"]
	if !hasQuery || !hasMessage || !hasDuration {
		return false
	}

	_, hasDataMessage := resp.Data[0]["Message"]

	return hasDataMessage
}
