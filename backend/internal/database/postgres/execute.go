package databasePostgres

import (
	"context"
	"fmt"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/dbo-studio/dbo/pkg/helper"
	"gorm.io/gorm"
)

func (r *PostgresRepository) buildExecuteQueries(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	node := r.base.ExtractNode(nodeID)

	type ExecuteParams map[contract.TreeTab]any

	executeParams, err := helper.ConvertToDTO[ExecuteParams](params)
	if err != nil {
		return nil, err
	}

	// Table create/edit flows are planned through the shared DDL planner so
	// preview and execute always emit the identical statement list.
	if action == contract.CreateTableAction || action == contract.EditTableAction {
		plan, _, err := r.BuildTablePlan(ctx, nodeID, action, params)
		if err != nil {
			return nil, err
		}

		return plan.SQLs(), nil
	}

	queries := []string{}

	for _, tabID := range databaseCore.SortedExecuteTabs(executeParams) {
		dbQueries, err := r.handleDatabaseCommands(node, tabID, action, params)
		if err != nil {
			return nil, err
		}

		viewQueries, err := r.handleViewCommands(node, tabID, action, params)
		if err != nil {
			return nil, err
		}

		materializedViewQueries, err := r.handleMaterializedViewCommands(node, tabID, action, params)
		if err != nil {
			return nil, err
		}

		routineQueries, err := r.handleRoutineCommands(ctx, node, tabID, action, params)
		if err != nil {
			return nil, err
		}

		sequenceQueries, err := r.handleSequenceCommands(node, tabID, action, params)
		if err != nil {
			return nil, err
		}

		typeQueries, err := r.handleTypeCommands(node, tabID, action, params)
		if err != nil {
			return nil, err
		}

		schemaQueries, err := r.handleSchemaCommands(node, tabID, action, params)
		if err != nil {
			return nil, err
		}

		tableQueries, t, err := r.handleTableCommands(node, tabID, action, params)
		if err != nil {
			return nil, err
		}

		if t != "" {
			node.Table = t
		}

		queries = append(queries, dbQueries...)
		queries = append(queries, viewQueries...)
		queries = append(queries, materializedViewQueries...)
		queries = append(queries, routineQueries...)
		queries = append(queries, sequenceQueries...)
		queries = append(queries, typeQueries...)
		queries = append(queries, schemaQueries...)
		queries = append(queries, tableQueries...)
	}

	return queries, nil
}

func (r *PostgresRepository) PreviewExecute(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) ([]string, error) {
	return r.buildExecuteQueries(ctx, nodeID, action, params)
}

func (r *PostgresRepository) Execute(ctx context.Context, nodeID string, action contract.TreeNodeActionName, params []byte) (*contract.ExecuteResult, error) {
	node := r.base.ExtractNode(nodeID)

	queries, err := r.buildExecuteQueries(ctx, nodeID, action, params)
	if err != nil {
		return nil, err
	}

	if action == contract.DropDatabaseAction && node.Database != "" {
		if err := r.base.CloseDatabase(ctx, node.Database); err != nil {
			return nil, err
		}
	}

	conn, err := r.executeConn(ctx, node, action)
	if err != nil {
		return nil, err
	}

	run := func(tx *gorm.DB) error {
		for _, query := range queries {
			if query == "" {
				continue
			}

			if err := tx.Exec(query).Error; err != nil {
				return err
			}
		}

		return nil
	}

	// Edits drop and recreate objects. One transaction means a failing CREATE rolls the DROP back
	// instead of leaving the object gone.
	if runsInTransaction(action) {
		err = conn.WithContext(ctx).Transaction(run)
	} else {
		err = run(conn.WithContext(ctx))
	}

	if err != nil {
		return nil, err
	}

	result := databaseCore.ResolveExecuteIdentity(r.base.Connection().ConnectionType, nodeID, action, params)

	return r.pinRoutineNode(ctx, node, action, result), nil
}

// pinRoutineNode adds the pg_proc oid to the node id of a routine that was just created or
// renamed. With overloads a bare name would be ambiguous, and the form reopened after the
// save would fail. The new routine is the highest oid of that name.
func (r *PostgresRepository) pinRoutineNode(ctx context.Context, node contract.DBNode, action contract.TreeNodeActionName, result *contract.ExecuteResult) *contract.ExecuteResult {
	var procedure bool

	switch action {
	case contract.CreateFunctionAction, contract.EditFunctionAction:
	case contract.CreateProcedureAction, contract.EditProcedureAction:
		procedure = true
	default:
		return result
	}

	if result == nil || result.NodeID == "" {
		return result
	}

	created := r.base.ExtractNode(result.NodeID)

	routines, err := r.routines(ctx, &created.Database, &created.Schema, procedure)
	if err != nil {
		return result
	}

	var newest *Routine

	for i := range routines {
		if routines[i].Name == created.Table && (newest == nil || routines[i].OID > newest.OID) {
			newest = &routines[i]
		}
	}

	if newest != nil {
		result.NodeID = fmt.Sprintf("%s~%d", result.NodeID, newest.OID)
	}

	return result
}

// runsInTransaction is false for statements PostgreSQL refuses inside a transaction block
// (database DDL) and for enum edits, whose ALTER TYPE ... ADD VALUE needs PostgreSQL 12+.
func runsInTransaction(action contract.TreeNodeActionName) bool {
	switch action {
	case contract.CreateDatabaseAction, contract.EditDatabaseAction, contract.DropDatabaseAction,
		contract.CreateTypeAction, contract.EditTypeAction:
		return false
	default:
		return true
	}
}

func (r *PostgresRepository) executeConn(ctx context.Context, node contract.DBNode, action contract.TreeNodeActionName) (*gorm.DB, error) {
	switch action {
	case contract.CreateDatabaseAction, contract.EditDatabaseAction, contract.DropDatabaseAction:
		return r.base.DB(), nil
	default:
		return r.db(ctx, &node.Database)
	}
}

// ExecuteAtomic runs every step in a single transaction on the steps' shared
// database. All queries are planned up front, as PreviewExecute does.
func (r *PostgresRepository) ExecuteAtomic(ctx context.Context, steps []contract.ExecuteStep) error {
	if len(steps) == 0 {
		return nil
	}

	database := r.base.ExtractNode(steps[0].NodeID).Database

	var queries []string

	for _, step := range steps {
		if r.base.ExtractNode(step.NodeID).Database != database {
			return fmt.Errorf("atomic execute needs every step on one database")
		}

		stepQueries, err := r.buildExecuteQueries(ctx, step.NodeID, step.Action, step.Params)
		if err != nil {
			return err
		}

		queries = append(queries, stepQueries...)
	}

	conn, err := r.db(ctx, &database)
	if err != nil {
		return err
	}

	return conn.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, query := range queries {
			if query == "" {
				continue
			}

			if err := tx.Exec(query).Error; err != nil {
				return err
			}
		}

		return nil
	})
}
