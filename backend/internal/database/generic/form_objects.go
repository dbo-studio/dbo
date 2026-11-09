package databaseGeneric

import (
	"context"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

// object resolves a form node id. A container id ("<ns>.tableContainer") means "create here".
func object(nodeID string) (namespace, name string) {
	namespace, name = node(nodeID)
	if name == string(contract.TableContainerNodeType) || name == string(contract.ViewContainerNodeType) ||
		name == string(contract.ProcedureContainerNodeType) || name == string(contract.FunctionContainerNodeType) {
		name = ""
	}

	return namespace, name
}

func (r *Repository) Objects(ctx context.Context, nodeID string, tabID contract.TreeTab, action contract.TreeNodeActionName) (*contract.FormResponse, error) {
	if r.isCreateNamespace(action) {
		return r.createNamespaceForm()
	}

	if procedure, ok := isRoutineAction(action); ok {
		if _, supported := r.routineDialect(); supported {
			return r.routineForm(ctx, nodeID, procedure)
		}
	}

	ns, name := object(nodeID)
	db := r.base.DB().WithContext(ctx)

	switch tabID {
	case contract.TableColumnsTab:
		rows := []map[string]any{}

		if name != "" {
			columns, err := r.d.Columns(ctx, db, ns, name)
			if err != nil {
				return nil, apperror.DriverError(err)
			}

			rows = lo.Map(columns, func(c ColumnInfo, _ int) map[string]any { return r.d.ColumnRow(c) })
		}

		general, err := r.base.BuildGeneralFormFieldsFromSchema(
			[]contract.FormField{{ID: "relname", Name: "Name", Type: contract.FormFieldTypeText, Required: true}},
			map[string]any{"relname": lo.Ternary(name == "", nil, any(name))},
		)
		if err != nil {
			return nil, err
		}

		return r.base.BuildHybridFormResponse(general, rows, r.d.ColumnFields())
	case contract.ViewTab:
		row := map[string]any{}

		if name != "" {
			query, err := r.d.ViewQuery(ctx, db, ns, name)
			if err != nil {
				return nil, apperror.DriverError(err)
			}

			row = map[string]any{"name": name, "query": query}
		}

		return r.base.BuildGeneralFormResponse([]contract.FormField{
			{ID: "name", Name: "Name", Type: contract.FormFieldTypeText, Required: true},
			{ID: "query", Name: "Query", Type: contract.FormFieldTypeQuery, Required: true},
		}, row)
	default:
		return r.constraintRows(ctx, ns, name, tabID)
	}
}
