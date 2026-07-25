package databaseCore

import (
	"strings"

	"github.com/blastrain/vitess-sqlparser/sqlparser"
	"github.com/samber/lo"
)

type TableRef struct {
	Name     string
	Alias    string
	Schema   string
	Database string
}

type SelectColumnRef struct {
	OutputName   string
	SourceTable  string
	SourceColumn string
	IsStar       bool
	IsAggregate  bool
	IsComputed   bool
	Ambiguous    bool
}

type UpdatableQueryAnalysis struct {
	IsSelect      bool
	HasJoin       bool
	HasGroupBy    bool
	HasDistinct   bool
	HasUnion      bool
	HasAggregate  bool
	Tables        []TableRef
	SelectColumns []SelectColumnRef
	DrivingTable  string
}

func AnalyzeUpdatableQuery(sqlText string, defaultDatabase, defaultSchema *string) UpdatableQueryAnalysis {
	analysis := UpdatableQueryAnalysis{
		Tables:        make([]TableRef, 0),
		SelectColumns: make([]SelectColumnRef, 0),
	}

	cleanSQL := strings.TrimSpace(sqlText)
	if cleanSQL == "" {
		return analysis
	}

	stmt, err := sqlparser.Parse(cleanSQL)
	if err != nil {
		return analysis
	}

	analysis.extractFromStatement(stmt, defaultDatabase, defaultSchema)
	return analysis
}

func (a *UpdatableQueryAnalysis) EditableReason() string {
	if !a.IsSelect {
		return "Only SELECT query results can be edited"
	}
	if a.HasUnion {
		return "UNION queries cannot be edited inline"
	}
	if a.HasGroupBy {
		return "GROUP BY queries cannot be edited inline"
	}
	if a.HasDistinct {
		return "DISTINCT queries cannot be edited inline"
	}
	if a.HasAggregate {
		return "Aggregate queries cannot be edited inline"
	}
	if len(a.Tables) == 0 {
		return "Could not determine source table"
	}
	if a.HasJoin && a.DrivingTable == "" {
		return "Could not determine driving table for JOIN query"
	}
	if !a.HasJoin && len(a.Tables) != 1 {
		return "Multiple source tables are not supported"
	}

	for _, col := range a.SelectColumns {
		if col.Ambiguous {
			return "Query contains ambiguous column references"
		}
	}

	return ""
}

func (a *UpdatableQueryAnalysis) TargetTable() string {
	if a.HasJoin {
		return a.DrivingTable
	}
	if len(a.Tables) == 1 {
		return a.Tables[0].Name
	}
	return ""
}

func (a *UpdatableQueryAnalysis) TargetSchema(defaultSchema *string) string {
	tableName := a.TargetTable()
	for _, table := range a.Tables {
		if table.Name == tableName && table.Schema != "" {
			return table.Schema
		}
	}
	return lo.FromPtr(defaultSchema)
}

func (a *UpdatableQueryAnalysis) TargetDatabase(defaultDatabase *string) string {
	tableName := a.TargetTable()
	for _, table := range a.Tables {
		if table.Name == tableName && table.Database != "" {
			return table.Database
		}
	}
	return lo.FromPtr(defaultDatabase)
}

func (a *UpdatableQueryAnalysis) IsColumnFromDrivingTable(outputName string) bool {
	if a.isSingleTableStarSelect() {
		return true
	}

	if a.hasDrivingTableStarSelect() {
		if a.isExplicitJoinedTableColumn(outputName) {
			return false
		}
		return true
	}

	for _, col := range a.SelectColumns {
		if col.OutputName != outputName {
			continue
		}
		if col.IsComputed || col.IsAggregate || col.Ambiguous {
			return false
		}
		if a.HasJoin {
			return col.SourceTable == a.DrivingTable
		}
		return col.SourceTable == a.TargetTable()
	}
	return false
}

func (a *UpdatableQueryAnalysis) isSingleTableStarSelect() bool {
	if a.HasJoin || len(a.Tables) != 1 {
		return false
	}

	return lo.SomeBy(a.SelectColumns, func(col SelectColumnRef) bool {
		return col.IsStar
	})
}

func (a *UpdatableQueryAnalysis) hasDrivingTableStarSelect() bool {
	if !a.HasJoin {
		return false
	}

	return lo.SomeBy(a.SelectColumns, func(col SelectColumnRef) bool {
		return col.IsStar && col.SourceTable == a.DrivingTable
	})
}

func (a *UpdatableQueryAnalysis) isExplicitJoinedTableColumn(outputName string) bool {
	for _, col := range a.SelectColumns {
		if col.OutputName != outputName || col.IsStar {
			continue
		}
		if col.IsComputed || col.IsAggregate || col.Ambiguous {
			continue
		}
		return col.SourceTable != "" && col.SourceTable != a.DrivingTable
	}

	return false
}

func (a *UpdatableQueryAnalysis) extractFromStatement(stmt sqlparser.Statement, defaultDatabase, defaultSchema *string) {
	switch node := stmt.(type) {
	case *sqlparser.Select:
		a.extractFromSelect(node, defaultDatabase, defaultSchema)
	case *sqlparser.Union:
		a.HasUnion = true
	}
}

func (a *UpdatableQueryAnalysis) extractFromSelect(stmt *sqlparser.Select, defaultDatabase, defaultSchema *string) {
	a.IsSelect = true

	if stmt.Distinct != "" {
		a.HasDistinct = true
	}

	if len(stmt.GroupBy) > 0 {
		a.HasGroupBy = true
	}

	a.Tables = extractTableRefs(stmt.From, defaultDatabase, defaultSchema)
	a.HasJoin = countJoins(stmt.From) > 0

	if len(a.Tables) > 0 {
		a.DrivingTable = a.Tables[0].Name
	}

	aliasMap := buildAliasMap(a.Tables)
	a.SelectColumns = extractSelectColumns(stmt.SelectExprs, aliasMap, a.Tables, a.HasJoin)
	a.HasAggregate = lo.SomeBy(a.SelectColumns, func(col SelectColumnRef) bool {
		return col.IsAggregate
	})
}

func extractTableRefs(from sqlparser.TableExprs, defaultDatabase, defaultSchema *string) []TableRef {
	if from == nil {
		return nil
	}

	refs := make([]TableRef, 0)
	collectTableRefs(from, &refs, defaultDatabase, defaultSchema)
	return refs
}

func collectTableRefs(from sqlparser.TableExprs, refs *[]TableRef, defaultDatabase, defaultSchema *string) {
	for _, tableExpr := range from {
		switch expr := tableExpr.(type) {
		case *sqlparser.AliasedTableExpr:
			if tableName, ok := expr.Expr.(sqlparser.TableName); ok {
				ref := tableRefFromName(tableName, defaultDatabase, defaultSchema)
				if expr.As.String() != "" {
					ref.Alias = expr.As.String()
				}
				*refs = append(*refs, ref)
			}
		case *sqlparser.JoinTableExpr:
			collectTableRefs(sqlparser.TableExprs{expr.LeftExpr}, refs, defaultDatabase, defaultSchema)
			collectTableRefs(sqlparser.TableExprs{expr.RightExpr}, refs, defaultDatabase, defaultSchema)
		}
	}
}

func tableRefFromName(tableName sqlparser.TableName, defaultDatabase, defaultSchema *string) TableRef {
	ref := TableRef{
		Name: tableName.Name.String(),
	}

	qualifier := tableName.Qualifier.String()
	if qualifier != "" {
		parts := strings.Split(qualifier, ".")
		switch len(parts) {
		case 1:
			ref.Schema = parts[0]
		case 2:
			ref.Database = parts[0]
			ref.Schema = parts[1]
		}
	}

	if ref.Schema == "" {
		ref.Schema = lo.FromPtr(defaultSchema)
	}
	if ref.Database == "" {
		ref.Database = lo.FromPtr(defaultDatabase)
	}

	return ref
}

func countJoins(from sqlparser.TableExprs) int {
	count := 0
	for _, tableExpr := range from {
		if _, ok := tableExpr.(*sqlparser.JoinTableExpr); ok {
			count++
		}
	}
	return count
}

func buildAliasMap(tables []TableRef) map[string]string {
	aliasMap := make(map[string]string)
	for _, table := range tables {
		aliasMap[strings.ToLower(table.Name)] = table.Name
		if table.Alias != "" {
			aliasMap[strings.ToLower(table.Alias)] = table.Name
		}
	}
	return aliasMap
}

func extractSelectColumns(
	selectExprs sqlparser.SelectExprs,
	aliasMap map[string]string,
	tables []TableRef,
	hasJoin bool,
) []SelectColumnRef {
	columns := make([]SelectColumnRef, 0)

	for _, selectExpr := range selectExprs {
		switch expr := selectExpr.(type) {
		case *sqlparser.StarExpr:
			tableName := resolveTableFromQualifier(expr.TableName, aliasMap, tables)
			if tableName == "" && !hasJoin && len(tables) == 1 {
				tableName = tables[0].Name
			}
			if tableName == "" {
				continue
			}
			columns = append(columns, SelectColumnRef{
				OutputName:   "*",
				SourceTable:  tableName,
				SourceColumn: "*",
				IsStar:       true,
			})
		case *sqlparser.AliasedExpr:
			columns = append(columns, analyzeAliasedExpr(expr, aliasMap, tables, hasJoin)...)
		}
	}

	return columns
}

func analyzeAliasedExpr(
	expr *sqlparser.AliasedExpr,
	aliasMap map[string]string,
	tables []TableRef,
	hasJoin bool,
) []SelectColumnRef {
	outputName := expr.As.String()
	if outputName == "" {
		if colName, ok := expr.Expr.(*sqlparser.ColName); ok {
			outputName = colName.Name.String()
		}
	}

	switch node := expr.Expr.(type) {
	case *sqlparser.ColName:
		sourceTable, ambiguous := resolveColumnTable(node, aliasMap, tables, hasJoin)
		if outputName == "" {
			outputName = node.Name.String()
		}
		return []SelectColumnRef{{
			OutputName:   outputName,
			SourceTable:  sourceTable,
			SourceColumn: node.Name.String(),
			Ambiguous:    ambiguous,
		}}
	case *sqlparser.FuncExpr:
		if outputName == "" {
			outputName = node.Name.String()
		}
		return []SelectColumnRef{{
			OutputName:  outputName,
			IsAggregate: true,
			IsComputed:  true,
		}}
	default:
		if outputName == "" {
			outputName = sqlparser.String(expr.Expr)
		}
		return []SelectColumnRef{{
			OutputName: outputName,
			IsComputed: true,
		}}
	}
}

func resolveColumnTable(
	colName *sqlparser.ColName,
	aliasMap map[string]string,
	tables []TableRef,
	hasJoin bool,
) (string, bool) {
	qualifier := colName.Qualifier.Name.String()
	if qualifier != "" {
		if table, ok := aliasMap[strings.ToLower(qualifier)]; ok {
			return table, false
		}
		return "", true
	}

	if hasJoin || len(tables) > 1 {
		return "", true
	}

	if len(tables) == 1 {
		return tables[0].Name, false
	}

	return "", false
}

func resolveTableFromQualifier(tableName sqlparser.TableName, aliasMap map[string]string, tables []TableRef) string {
	qualifier := tableName.Name.String()
	if qualifier == "" {
		return ""
	}

	if table, ok := aliasMap[strings.ToLower(qualifier)]; ok {
		return table
	}

	for _, table := range tables {
		if strings.EqualFold(table.Name, qualifier) || strings.EqualFold(table.Alias, qualifier) {
			return table.Name
		}
	}

	return ""
}
