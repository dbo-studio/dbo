package databaseSqlite

import (
	"context"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	"github.com/dbo-studio/dbo/pkg/helper"
)

// BuildTablePlan is the single planning entrypoint shared by PreviewExecute
// and Execute for create-table / edit-table actions. The returned string is
// the reserved tmp table name for the recreate flow (empty on create).
func (r *SQLiteRepository) BuildTablePlan(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) (ddl.Plan, string, error) {
	if action != contract.CreateTableAction && action != contract.EditTableAction {
		return nil, "", nil
	}

	executeParams, err := helper.ConvertToDTO[map[contract.TreeTab]any](params)
	if err != nil {
		return nil, "", err
	}

	queries, tmpTableName, err := r.handleTableCommands(ctx, nodeID, executeParams, action, params)
	if err != nil {
		return nil, "", err
	}

	plan := make(ddl.Plan, 0, len(queries))
	for _, query := range queries {
		plan = append(plan, ddl.Statement{SQL: query, Phase: ddl.PhaseTable})
	}

	return plan, tmpTableName, nil
}
