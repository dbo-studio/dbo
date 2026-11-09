package databaseGeneric

import (
	"context"
	"fmt"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

// Tree levels: root (id "") -> namespaces -> "<ns>.tableContainer" | "<ns>.viewContainer" -> objects ("<ns>.<name>").
func (r *Repository) Tree(ctx context.Context, parentID string) (*contract.TreeNode, error) {
	if parentID == "" {
		return r.buildRoot(ctx)
	}

	namespace, container, hasContainer := strings.Cut(parentID, ".")
	if !hasContainer {
		return r.namespaceNode(namespace, true), nil
	}

	return r.buildContainer(ctx, namespace, contract.TreeNodeType(container))
}

func (r *Repository) namespaceType() contract.TreeNodeType {
	return lo.Ternary(r.d.NamespaceIsSchema(), contract.SchemaNodeType, contract.DatabaseNodeType)
}

func (r *Repository) namespaceNode(name string, withContainers bool) *contract.TreeNode {
	node := &contract.TreeNode{
		ID:          name,
		Name:        name,
		Type:        r.namespaceType(),
		Icon:        lo.ToPtr(lo.Ternary(r.d.NamespaceIsSchema(), "network", "database")),
		HasChildren: true,
		ContextMenu: r.ContextMenu(r.namespaceType()),
		Children:    make([]contract.TreeNode, 0),
	}

	if withContainers {
		for _, c := range []struct {
			name string
			id   contract.TreeNodeType
		}{{"Tables", contract.TableContainerNodeType}, {"Views", contract.ViewContainerNodeType}, {"Procedures", contract.ProcedureContainerNodeType}, {"Functions", contract.FunctionContainerNodeType}} {
			if _, routine := isRoutineContainer(c.id); routine && !r.hasRoutines() {
				continue
			}

			node.Children = append(node.Children, contract.TreeNode{
				ID:          fmt.Sprintf("%s.%s", name, c.id),
				Name:        c.name,
				Type:        c.id,
				HasChildren: true,
				ContextMenu: r.ContextMenu(c.id),
				Children:    make([]contract.TreeNode, 0),
			})
		}
	}

	return node
}

func (r *Repository) buildRoot(ctx context.Context) (*contract.TreeNode, error) {
	conn := r.base.Connection()
	root := &contract.TreeNode{
		ID:          fmt.Sprintf("%d@database", conn.ID),
		Name:        conn.Name,
		Icon:        lo.ToPtr(contract.TreeIcon(conn.ConnectionType)),
		Type:        contract.DatabaseContainerNodeType,
		HasChildren: true,
		ContextMenu: r.ContextMenu(contract.DatabaseContainerNodeType),
		Children:    make([]contract.TreeNode, 0),
	}

	namespaces, err := r.d.Namespaces(ctx, r.base.DB().WithContext(ctx))
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	for _, ns := range namespaces {
		root.Children = append(root.Children, *r.namespaceNode(ns, false))
	}

	return root, nil
}

func (r *Repository) buildContainer(ctx context.Context, namespace string, container contract.TreeNodeType) (*contract.TreeNode, error) {
	node := &contract.TreeNode{
		ID:          fmt.Sprintf("%s.%s", namespace, container),
		Name:        string(container),
		Type:        container,
		HasChildren: true,
		ContextMenu: r.ContextMenu(container),
		Children:    make([]contract.TreeNode, 0),
	}

	db := r.base.DB().WithContext(ctx)

	var (
		names    []string
		err      error
		nodeType contract.TreeNodeType
	)

	switch container {
	case contract.TableContainerNodeType:
		names, err = r.d.Tables(ctx, db, namespace)
		nodeType = contract.TableNodeType
	case contract.ViewContainerNodeType:
		names, err = r.d.Views(ctx, db, namespace)
		nodeType = contract.ViewNodeType
	case contract.ProcedureContainerNodeType, contract.FunctionContainerNodeType:
		d, ok := r.routineDialect()
		if !ok {
			return nil, fmt.Errorf("unsupported container type: %s", container)
		}

		procedure := container == contract.ProcedureContainerNodeType
		names, err = d.Routines(ctx, db, namespace, procedure)
		nodeType = lo.Ternary(procedure, contract.ProcedureNodeType, contract.FunctionNodeType)
	default:
		return nil, fmt.Errorf("unsupported container type: %s", container)
	}

	if err != nil {
		return nil, apperror.DriverError(err)
	}

	for _, name := range names {
		action := &contract.TreeNodeAction{
			Type: contract.TreeNodeActionTypeTab,
			Params: map[string]any{
				"path":     "data",
				"table":    name,
				"editable": nodeType == contract.TableNodeType && r.d.Editable(),
			},
		}
		// A routine has no rows to browse: opening it opens its definition.
		if _, routine := isRoutineNode(nodeType); routine {
			action = &r.ContextMenu(nodeType)[0]
		}

		node.Children = append(node.Children, contract.TreeNode{
			ID:          nodeID(namespace, name),
			Name:        name,
			Icon:        lo.ToPtr("sheet"),
			Type:        nodeType,
			Action:      action,
			ContextMenu: r.ContextMenu(nodeType),
			Children:    make([]contract.TreeNode, 0),
		})
	}

	return node, nil
}

func (r *Repository) ContextMenu(nodeType contract.TreeNodeType) []contract.TreeNodeAction {
	object := map[string]any{"path": "object"}
	detail := map[string]any{"path": "object-detail"}
	actions := make([]contract.TreeNodeAction, 0, 5)

	kind := lo.Ternary(r.d.NamespaceIsSchema(), "schema", "database")

	switch nodeType {
	case contract.ProcedureContainerNodeType:
		actions = append(actions, contract.TreeNodeAction{Title: "Create procedure", Name: contract.CreateProcedureAction, Type: contract.TreeNodeActionTypeTab, Params: object})
	case contract.FunctionContainerNodeType:
		actions = append(actions, contract.TreeNodeAction{Title: "Create function", Name: contract.CreateFunctionAction, Type: contract.TreeNodeActionTypeTab, Params: object})
	case contract.ProcedureNodeType:
		actions = append(actions,
			contract.TreeNodeAction{Title: "Edit procedure", Name: contract.EditProcedureAction, Type: contract.TreeNodeActionTypeTab, Params: detail},
			contract.TreeNodeAction{Title: "Drop procedure", Name: contract.DropProcedureAction, Type: contract.TreeNodeActionTypeAction},
			contract.TreeNodeAction{Title: "Copy name", Name: contract.CopyNameAction, Type: contract.TreeNodeActionTypeCommand},
		)
	case contract.FunctionNodeType:
		actions = append(actions,
			contract.TreeNodeAction{Title: "Edit function", Name: contract.EditFunctionAction, Type: contract.TreeNodeActionTypeTab, Params: detail},
			contract.TreeNodeAction{Title: "Drop function", Name: contract.DropFunctionAction, Type: contract.TreeNodeActionTypeAction},
			contract.TreeNodeAction{Title: "Copy name", Name: contract.CopyNameAction, Type: contract.TreeNodeActionTypeCommand},
		)
	}

	switch {
	case nodeType == contract.DatabaseContainerNodeType:
		actions = append(actions, contract.TreeNodeAction{
			Title:  "Create " + kind,
			Name:   lo.Ternary(r.d.NamespaceIsSchema(), contract.CreateSchemaAction, contract.CreateDatabaseAction),
			Type:   contract.TreeNodeActionTypeTab,
			Params: object,
		})
	case nodeType == r.namespaceType():
		actions = append(actions, contract.TreeNodeAction{
			Title: "Drop " + kind,
			Name:  lo.Ternary(r.d.NamespaceIsSchema(), contract.DropSchemaAction, contract.DropDatabaseAction),
			Type:  contract.TreeNodeActionTypeAction,
		})
	}

	switch nodeType {
	case contract.TableContainerNodeType:
		actions = append(actions, contract.TreeNodeAction{Title: "Create table", Name: contract.CreateTableAction, Type: contract.TreeNodeActionTypeTab, Params: object})
	case contract.TableNodeType:
		actions = append(actions,
			contract.TreeNodeAction{Title: "Edit table", Name: contract.EditTableAction, Type: contract.TreeNodeActionTypeTab, Params: detail},
			contract.TreeNodeAction{Title: "Drop table", Name: contract.DropTableAction, Type: contract.TreeNodeActionTypeAction},
			contract.TreeNodeAction{Title: "Rename", Name: contract.RenameAction, Type: contract.TreeNodeActionTypeCommand},
		)
	case contract.ViewContainerNodeType:
		actions = append(actions, contract.TreeNodeAction{Title: "Create view", Name: contract.CreateViewAction, Type: contract.TreeNodeActionTypeTab, Params: object})
	case contract.ViewNodeType:
		actions = append(actions,
			contract.TreeNodeAction{Title: "Edit view", Name: contract.EditViewAction, Type: contract.TreeNodeActionTypeTab, Params: detail},
			contract.TreeNodeAction{Title: "Drop view", Name: contract.DropViewAction, Type: contract.TreeNodeActionTypeAction},
		)
	}

	if nodeType == contract.TableNodeType || nodeType == contract.ViewNodeType {
		actions = append(actions, contract.TreeNodeAction{Title: "Copy name", Name: contract.CopyNameAction, Type: contract.TreeNodeActionTypeCommand})
	}

	return append(actions, contract.TreeNodeAction{Title: "Refresh", Name: contract.RefreshAction, Type: contract.TreeNodeActionTypeCommand})
}
