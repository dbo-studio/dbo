package serviceDbtools

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
)

const (
	// Tables above this many rows are measured on their first statsSampleRows rows.
	statsSampleRows = 100000
	statsMaxColumns = 50
)

type columnStats struct {
	Name          string  `json:"name"`
	Type          string  `json:"type"`
	NullPercent   float64 `json:"nullPercent"`
	DistinctCount *int64  `json:"distinctCount,omitempty"`
	Min           any     `json:"min,omitempty"`
	Max           any     `json:"max,omitempty"`
}

// tableStats measures a table's shape: its row count and, per column, the share of NULLs,
// the number of distinct values and the smallest and largest value.
func (r *Registry) tableStats(ctx context.Context, args map[string]any, toolCtx ToolContext) (string, error) {
	table, _ := args["table"].(string)
	if strings.TrimSpace(table) == "" {
		return "", fmt.Errorf("table is required")
	}

	conn, err := r.connectionRepo.Find(ctx, toolCtx.ConnectionID)
	if err != nil {
		return "", fmt.Errorf("connection not found: %w", err)
	}

	toolCtx.Database = r.resolveDatabase(args, toolCtx)
	toolCtx.Schema = r.resolveSchema(args, toolCtx)

	connectionType := conn.ConnectionType
	sqlite := !databaseContract.IsPostgresFamily(connectionType) && !databaseContract.IsMysqlFamily(connectionType)
	ident := func(name string) string { return quoteIdent(connectionType, name) }
	source := qualifiedSource(connectionType, table, toolCtx)

	shape, err := r.query(ctx, conn, "SELECT * FROM "+source+" WHERE 1 = 0", toolCtx)
	if err != nil {
		return "", err
	}

	counted, err := r.query(ctx, conn, "SELECT COUNT(*) AS n FROM "+source, toolCtx)
	if err != nil {
		return "", err
	}

	rows := toInt(counted.Data[0]["n"])

	measured := source
	if rows > statsSampleRows {
		measured = fmt.Sprintf("(%s) sampled", selectFirst(connectionType, source, statsSampleRows))
	}

	columns := lo.Slice(shape.Columns, 0, statsMaxColumns)
	selects := []string{"COUNT(*) AS n"}

	for i, column := range columns {
		name := ident(column.Name)
		selects = append(selects, fmt.Sprintf("COUNT(%s) AS c%d_set", name, i))
		// SQLite compares any value; elsewhere JSON, binary and geometric types have no equality or ordering.
		switch mapped := column.MappedType; {
		case sqlite, lo.Contains([]string{databaseCore.MappedTypeNumber, databaseCore.MappedTypeString, databaseCore.MappedTypeDate, databaseCore.MappedTypeDateTime, databaseCore.MappedTypeTime}, mapped):
			selects = append(selects,
				fmt.Sprintf("COUNT(DISTINCT %s) AS c%d_distinct", name, i),
				fmt.Sprintf("MIN(%s) AS c%d_min", name, i),
				fmt.Sprintf("MAX(%s) AS c%d_max", name, i))
		case lo.Contains([]string{databaseCore.MappedTypeEnum, databaseCore.MappedTypeUUID, databaseCore.MappedTypeBoolean}, mapped):
			selects = append(selects, fmt.Sprintf("COUNT(DISTINCT %s) AS c%d_distinct", name, i))
		}
	}

	measuredStats, err := r.query(ctx, conn, "SELECT "+strings.Join(selects, ", ")+" FROM "+measured, toolCtx)
	if err != nil {
		return "", err
	}

	row := measuredStats.Data[0]
	total := toInt(row["n"])

	stats := make([]columnStats, len(columns))
	for i, column := range columns {
		key := "c" + strconv.Itoa(i)

		stats[i] = columnStats{Name: column.Name, Type: column.Type, Min: row[key+"_min"], Max: row[key+"_max"]}
		if total > 0 {
			stats[i].NullPercent = float64(int((1-float64(toInt(row[key+"_set"]))/float64(total))*1000)) / 10
		}

		if distinct, ok := row[key+"_distinct"]; ok {
			stats[i].DistinctCount = lo.ToPtr(toInt(distinct))
		}
	}

	result := map[string]any{"table": table, "rows": rows, "columns": stats}
	if rows > statsSampleRows {
		result["sampledRows"] = statsSampleRows
	}

	if len(shape.Columns) > statsMaxColumns {
		result["note"] = fmt.Sprintf("only the first %d of %d columns are measured", statsMaxColumns, len(shape.Columns))
	}

	raw, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return "", err
	}

	return string(raw), nil
}

func quoteIdent(connectionType, name string) string {
	switch {
	case databaseContract.IsPostgresFamily(connectionType):
		return quote.PostgresIdent(name)
	case databaseContract.IsMysqlFamily(connectionType):
		return quote.MysqlIdent(name)
	default:
		return quote.SqliteIdent(name)
	}
}

// qualifiedSource is the table as a FROM clause names it, inside the tool's database or schema.
func qualifiedSource(connectionType, table string, toolCtx ToolContext) string {
	switch {
	case databaseContract.IsPostgresFamily(connectionType):
		return quote.PostgresQualifiedTable(lo.CoalesceOrEmpty(lo.FromPtr(toolCtx.Schema), "public"), table)
	case databaseContract.IsMysqlFamily(connectionType) && lo.FromPtr(toolCtx.Database) != "":
		return quote.MysqlQualifiedTable(lo.FromPtr(toolCtx.Database), table)
	default:
		return quoteIdent(connectionType, table)
	}
}

// toInt reads a count, which drivers return as integers, floats, numeric strings or bytes,
// sometimes behind a pointer; its JSON form is the same in every case.
func toInt(value any) int64 {
	if raw, ok := value.([]byte); ok {
		value = string(raw)
	}

	encoded, _ := json.Marshal(value)
	n, _ := strconv.ParseFloat(strings.Trim(string(encoded), `"`), 64)

	return int64(n)
}

// selectFirst reads the first n rows of source. T-SQL has no LIMIT, it uses TOP.
func selectFirst(connectionType, source string, n int) string {
	if connectionType == databaseContract.SQLServer {
		return fmt.Sprintf("SELECT TOP %d * FROM %s", n, source)
	}

	return fmt.Sprintf("SELECT * FROM %s LIMIT %d", source, n)
}
