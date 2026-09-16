package databasePostgres

import (
	"fmt"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
)

// handleTableCommands builds table-level statements for the remaining
// non-planned actions (drop). Table create/edit are handled by the
// shared DDL planner (BuildTablePlan).
func (r *PostgresRepository) handleTableCommands(node contract.DBNode, tabID contract.TreeTab, action contract.TreeNodeActionName, _ []byte) ([]string, string, error) {
	if tabID != contract.GeneralTab || action != contract.DropTableAction {
		return []string{}, "", nil
	}

	query := fmt.Sprintf("DROP TABLE %s", quote.PostgresQualifiedTable(node.Schema, node.Table))

	return []string{query}, "", nil
}
