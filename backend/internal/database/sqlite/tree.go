package databaseSqlite

import (
	"context"
	"fmt"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

func (r *SQLiteRepository) Tree(ctx context.Context, parentID string) (*contract.TreeNode, error) {
	if parentID == "" {
		return buildRoot(ctx, r)
	}

	return buildContainer(ctx, r, contract.TreeNodeType(parentID))
}

func buildRoot(ctx context.Context, r *SQLiteRepository) (*contract.TreeNode, error) {
	root := &contract.TreeNode{
		ID:          fmt.Sprintf("%d@database", r.connection.ID),
		Name:        r.connection.Name,
		Icon:        lo.ToPtr("sqlite"),
		Type:        contract.TableContainerNodeType,
		HasChildren: true,
		ContextMenu: r.ContextMenu(contract.TableContainerNodeType),
		Children:    make([]contract.TreeNode, 0),
	}

	containers := []struct {
		name        string
		id          contract.TreeNodeType
		contextMenu []contract.TreeNodeAction
	}{
		{
			"Tables",
			contract.TableContainerNodeType,
			r.ContextMenu(contract.TableContainerNodeType),
		},
		{
			"Views",
			contract.ViewContainerNodeType,
			r.ContextMenu(contract.ViewContainerNodeType),
		},
	}

	for _, c := range containers {
		root.Children = append(root.Children, contract.TreeNode{
			ID:          string(c.id),
			Name:        c.name,
			Type:        c.id,
			HasChildren: true,
			ContextMenu: c.contextMenu,
			Children:    make([]contract.TreeNode, 0),
		})
	}

	return root, nil
}

func buildContainer(ctx context.Context, r *SQLiteRepository, container contract.TreeNodeType) (*contract.TreeNode, error) {
	containerNode := &contract.TreeNode{
		ID:          string(container),
		Name:        string(container),
		Type:        container,
		HasChildren: true,
		ContextMenu: r.ContextMenu(container),
		Children:    make([]contract.TreeNode, 0),
	}
	switch container {
	case contract.TableContainerNodeType:
		tables, err := r.getAllTableList()
		if err != nil {
			return nil, apperror.DriverError(err)
		}
		for _, table := range tables {
			containerNode.Children = append(containerNode.Children, contract.TreeNode{
				ID:   table.Name,
				Name: table.Name,
				Icon: lo.ToPtr("sheet"),
				Type: contract.TableNodeType,
				Action: &contract.TreeNodeAction{
					Type: contract.TreeNodeActionTypeTab,
					Params: map[string]interface{}{
						"path":     "data",
						"table":    table.Name,
						"editable": true,
					},
				},
				ContextMenu: r.ContextMenu(contract.TableNodeType),
				Children:    make([]contract.TreeNode, 0),
			})
		}
	case contract.ViewContainerNodeType:
		viewList, err := r.getAllViewList()
		if err != nil {
			return nil, apperror.DriverError(err)
		}
		for _, view := range viewList {
			containerNode.Children = append(containerNode.Children, contract.TreeNode{
				ID:   view.Name,
				Name: view.Name,
				Type: contract.ViewNodeType,
				Icon: lo.ToPtr("sheet"),
				Action: &contract.TreeNodeAction{
					Type: contract.TreeNodeActionTypeTab,
					Params: map[string]interface{}{
						"path":     "data",
						"table":    view.Name,
						"editable": false,
					},
				},
				ContextMenu: r.ContextMenu(contract.ViewNodeType),
				Children:    make([]contract.TreeNode, 0),
			})
		}
	default:
		return nil, fmt.Errorf("unsupported container type: %s", container)
	}
	return containerNode, nil
}
