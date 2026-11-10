package serviceDbtools

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceSafemode "github.com/dbo-studio/dbo/internal/service/safemode"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/sqlguard"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
)

type ToolContext struct {
	ConnectionID int32
	Schema       *string
	Database     *string
	// Args are values bound to the placeholders of the statement, for callers that fill it from user input.
	Args []any
}

type Registry struct {
	cm             *databaseConnection.ConnectionManager
	connectionRepo repository.IConnectionRepo
	unlockStore    *serviceSafemode.UnlockStore
}

func NewRegistry(cm *databaseConnection.ConnectionManager, connectionRepo repository.IConnectionRepo, appCache cache.Cache) *Registry {
	return &Registry{
		cm:             cm,
		connectionRepo: connectionRepo,
		unlockStore:    serviceSafemode.NewUnlockStore(appCache),
	}
}

func (r *Registry) Execute(ctx context.Context, toolName string, args map[string]any, toolCtx ToolContext) (string, error) {
	switch toolName {
	case "list_tables":
		return r.listTables(ctx, args, toolCtx)
	case "list_views":
		return r.listViews(ctx, args, toolCtx)
	case "describe_table":
		return r.describeTable(ctx, args, toolCtx)
	case "execute_sql", ToolShowChart:
		// A chart runs its SELECT exactly like execute_sql; the chart settings only matter to the UI.
		return r.executeSQL(ctx, args, toolCtx)
	case ToolExplainQuery:
		return r.explainQuery(ctx, args, toolCtx)
	case ToolTableStats:
		return r.tableStats(ctx, args, toolCtx)
	case "list_connections":
		return r.listConnections(ctx)
	default:
		return "", fmt.Errorf("unknown tool: %s", toolName)
	}
}

func (r *Registry) repoFor(ctx context.Context, connectionID int32) (databaseContract.DBToolsRepository, error) {
	conn, err := r.connectionRepo.Find(ctx, connectionID)
	if err != nil {
		return nil, fmt.Errorf("connection not found: %w", err)
	}

	repo, err := database.NewDBToolsRepository(ctx, conn, r.cm)
	if err != nil {
		return nil, err
	}

	return repo, nil
}

func (r *Registry) resolveDatabase(args map[string]any, toolCtx ToolContext) *string {
	if v, ok := args["database"].(string); ok && v != "" {
		return &v
	}

	return toolCtx.Database
}

func (r *Registry) resolveSchema(args map[string]any, toolCtx ToolContext) *string {
	if v, ok := args["schema"].(string); ok && v != "" {
		return &v
	}

	return toolCtx.Schema
}

func (r *Registry) listTables(ctx context.Context, args map[string]any, toolCtx ToolContext) (string, error) {
	repo, err := r.repoFor(ctx, toolCtx.ConnectionID)
	if err != nil {
		return "", err
	}

	database := r.resolveDatabase(args, toolCtx)
	schema := r.resolveSchema(args, toolCtx)

	names, err := repo.ListTableNames(ctx, database, schema)
	if err != nil {
		return "", err
	}

	return formatStringList(names), nil
}

func (r *Registry) listViews(ctx context.Context, args map[string]any, toolCtx ToolContext) (string, error) {
	repo, err := r.repoFor(ctx, toolCtx.ConnectionID)
	if err != nil {
		return "", err
	}

	database := r.resolveDatabase(args, toolCtx)
	schema := r.resolveSchema(args, toolCtx)

	names, err := repo.ListViewNames(ctx, database, schema)
	if err != nil {
		return "", err
	}

	return formatStringList(names), nil
}

func (r *Registry) describeTable(ctx context.Context, args map[string]any, toolCtx ToolContext) (string, error) {
	table, _ := args["table"].(string)
	if strings.TrimSpace(table) == "" {
		return "", fmt.Errorf("table is required")
	}

	repo, err := r.repoFor(ctx, toolCtx.ConnectionID)
	if err != nil {
		return "", err
	}

	toolCtx.Database = r.resolveDatabase(args, toolCtx)
	toolCtx.Schema = r.resolveSchema(args, toolCtx)

	description, err := repo.DescribeTable(ctx, table, toolCtx.Database, toolCtx.Schema)
	if err != nil {
		return "", err
	}

	return description + r.sampleRows(ctx, table, toolCtx), nil
}

// describeSampleRows is how many rows describe_table shows, so the model sees which columns hold the values
// (a name column that is always NULL looks like any other in the column list).
const describeSampleRows = 3

// sampleRows reads a few rows of the table for describe_table. It is a courtesy: when Safe Mode or an error
// stops it, the description goes without.
func (r *Registry) sampleRows(ctx context.Context, table string, toolCtx ToolContext) string {
	conn, err := r.connectionRepo.Find(ctx, toolCtx.ConnectionID)
	if err != nil {
		return ""
	}

	sample, err := r.query(ctx, conn, selectFirst(conn.ConnectionType, qualifiedSource(conn.ConnectionType, table, toolCtx), describeSampleRows), toolCtx)
	if err != nil || len(sample.Data) == 0 {
		return ""
	}

	rows := lo.Map(sample.Data, func(row map[string]any, _ int) map[string]any {
		return lo.OmitByKeys(row, []string{"dbo_index", "editable"})
	})

	raw, err := json.Marshal(rows)
	if err != nil {
		return ""
	}

	return "\nSample rows (any 3 rows, only to show what the columns hold; they are not an answer, so run a query for the rows the user asked for):\n" + truncateText(string(raw), 3000) + "\n"
}

func (r *Registry) executeSQL(ctx context.Context, args map[string]any, toolCtx ToolContext) (string, error) {
	sqlText, _ := args["sql"].(string)

	conn, err := r.connectionRepo.Find(ctx, toolCtx.ConnectionID)
	if err != nil {
		return "", fmt.Errorf("connection not found: %w", err)
	}

	safeSQL, err := GuardReadOnlySQLFor(conn.ConnectionType, sqlText)
	if err != nil {
		return "", err
	}

	return r.runReadOnly(ctx, conn, safeSQL, toolCtx)
}

// explainQuery returns the plan of one SELECT without running it (no ANALYZE).
func (r *Registry) explainQuery(ctx context.Context, args map[string]any, toolCtx ToolContext) (string, error) {
	sqlText, _ := args["sql"].(string)

	safeSQL, err := GuardExplainSQL(sqlText)
	if err != nil {
		return "", err
	}

	conn, err := r.connectionRepo.Find(ctx, toolCtx.ConnectionID)
	if err != nil {
		return "", fmt.Errorf("connection not found: %w", err)
	}

	switch {
	case databaseContract.IsPostgresFamily(conn.ConnectionType), databaseContract.IsMysqlFamily(conn.ConnectionType):
		safeSQL = "EXPLAIN " + safeSQL
	case conn.ConnectionType == databaseContract.Sqlite:
		safeSQL = "EXPLAIN QUERY PLAN " + safeSQL
	case conn.ConnectionType == databaseContract.ClickHouse:
		safeSQL = "EXPLAIN " + safeSQL
	default:
		return "", fmt.Errorf("query plans are not available for %s connections", conn.ConnectionType)
	}

	return r.runReadOnly(ctx, conn, safeSQL, toolCtx)
}

// runReadOnly runs an already guarded read-only statement and returns its rows as JSON.
func (r *Registry) runReadOnly(ctx context.Context, conn *model.Connection, safeSQL string, toolCtx ToolContext) (string, error) {
	resp, err := r.query(ctx, conn, safeSQL, toolCtx)
	if err != nil {
		return "", err
	}

	resp.Data = TruncateQueryResult(resp.Data)

	// The model and the chat only need names and types; the grid's editing metadata only costs tokens.
	columns := lo.Map(resp.Columns, func(column databaseContract.Column, _ int) map[string]string {
		return map[string]string{"name": column.Name, "type": column.Type}
	})

	raw, err := json.MarshalIndent(map[string]any{
		"query":   resp.Query,
		"columns": columns,
		"rows":    resp.Data,
		"count":   len(resp.Data),
	}, "", "  ")
	if err != nil {
		return "", err
	}

	return string(raw), nil
}

// query runs a statement the caller already knows is read-only, under the connection's Safe Mode and the tool timeout.
func (r *Registry) query(ctx context.Context, conn *model.Connection, safeSQL string, toolCtx ToolContext) (*databaseContract.RawQueryResponse, error) {
	// Tools never confirm on the user's behalf: under Safe Mode "safe" even
	// reads need the user to unlock the connection first.
	policy := r.unlockStore.WithUnlock(ctx, helper.CtxOwnerID(ctx), conn.ID, serviceSafemode.FromConnection(conn))
	if err := serviceSafemode.Enforce(policy, sqlguard.ClassRead, false); err != nil {
		return nil, fmt.Errorf("blocked by Safe Mode on this connection: unlock it (lock icon in the header) to let the assistant run queries")
	}

	repo, err := database.NewDBToolsRepository(ctx, conn, r.cm)
	if err != nil {
		return nil, err
	}

	queryCtx, cancel := context.WithTimeout(ctx, queryTimeout)
	defer cancel()

	resp, err := repo.RunRawQuery(queryCtx, &dto.RawQueryRequest{
		ConnectionID: toolCtx.ConnectionID,
		Query:        safeSQL,
		Database:     toolCtx.Database,
		Schema:       toolCtx.Schema,
		Args:         toolCtx.Args,
	})
	if err != nil {
		return nil, err
	}

	// The editor shows a failed statement as a result row; a tool must fail, so the model fixes its SQL.
	if err := databaseCore.CommandError(resp); err != nil {
		return nil, err
	}

	return resp, nil
}

func (r *Registry) listConnections(ctx context.Context) (string, error) {
	connections, err := r.connectionRepo.Index(ctx)
	if err != nil {
		return "", err
	}

	if connections == nil {
		return "[]", nil
	}

	type connInfo struct {
		ID   uint   `json:"id"`
		Name string `json:"name"`
		Type string `json:"type"`
	}

	list := make([]connInfo, 0, len(*connections))
	for _, c := range *connections {
		if !c.IsActive {
			continue
		}

		list = append(list, connInfo{
			ID:   c.ID,
			Name: c.Name,
			Type: c.ConnectionType,
		})
	}

	raw, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return "", err
	}

	return string(raw), nil
}

func (r *Registry) ResolveConnectionID(ctx context.Context, args map[string]any, defaultConnID *uint) (int32, error) {
	if v, ok := args["connection_id"]; ok {
		switch id := v.(type) {
		case float64:
			return int32(id), nil
		case int:
			return int32(id), nil
		case int32:
			return id, nil
		case int64:
			return int32(id), nil
		}
	}

	if defaultConnID != nil {
		return int32(*defaultConnID), nil
	}

	connections, err := r.connectionRepo.Index(ctx)
	if err != nil {
		return 0, err
	}

	if connections != nil {
		for _, c := range *connections {
			if c.IsActive {
				return int32(c.ID), nil
			}
		}
	}

	return 0, fmt.Errorf("no active connection found")
}

func formatStringList(items []string) string {
	if len(items) == 0 {
		return "[]"
	}

	var b strings.Builder
	b.WriteString("[\n")

	for i, item := range items {
		fmt.Fprintf(&b, "  %q", item)

		if i < len(items)-1 {
			b.WriteString(",")
		}

		b.WriteString("\n")
	}

	b.WriteString("]")

	return b.String()
}

const queryTimeout = 10 * time.Second

func truncateText(text string, limit int) string {
	if len(text) <= limit {
		return text
	}

	return text[:limit] + "…"
}
