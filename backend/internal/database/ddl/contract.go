package ddl

import (
	"context"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

// Phase marks which Object Form tab a statement belongs to. Plans are always
// assembled in phase order: table → columns → keys → indexes → foreign keys.
type Phase string

const (
	PhaseTable       Phase = "table"
	PhaseColumns     Phase = "columns"
	PhaseKeys        Phase = "keys"
	PhaseIndexes     Phase = "indexes"
	PhaseForeignKeys Phase = "foreign_keys"
)

// Statement is a single DDL statement produced by a planner.
type Statement struct {
	SQL   string
	Phase Phase
}

// Plan is the ordered statement list shared by PreviewExecute and Execute.
type Plan []Statement

// SQLs flattens the plan to the statement list executed against the database.
func (p Plan) SQLs() []string {
	sqls := make([]string, 0, len(p))
	for _, statement := range p {
		sqls = append(sqls, statement.SQL)
	}

	return sqls
}

// TablePlanBuilder is implemented by each engine repository so that
// PreviewExecute and Execute emit the identical statement list for
// create-table / edit-table actions.
type TablePlanBuilder interface {
	BuildTablePlan(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) (Plan, string, error)
}

// TableNameFromGeneral resolves the table name for a create-table action
// started on the table container node, where node.Table is not yet a name.
func TableNameFromGeneral(newName *string, fallback string) string {
	if newName != nil && *newName != "" {
		return *newName
	}

	return fallback
}
