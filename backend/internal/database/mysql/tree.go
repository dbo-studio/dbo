package databaseMysql

import (
	"context"
	"fmt"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

func (r *MySQLRepository) Tree(ctx context.Context, parentID string) (*contract.TreeNode, error) {
	if parentID == "" {
		return buildRoot(ctx, r)
	}

	parts := strings.Split(parentID, ".")
	switch len(parts) {
	case 1:
		return buildDatabase(ctx, r, parts[0])
	case 2:
		return buildContainer(ctx, r, parts[0], contract.TreeNodeType(parts[1]))
	default:
		return nil, fmt.Errorf("unsupported parent_id: %s", parentID)
	}
}

func buildRoot(ctx context.Context, r *MySQLRepository) (*contract.TreeNode, error) {
	root := &contract.TreeNode{
		ID:          fmt.Sprintf("%d@database", r.connection.ID),
		Name:        r.connection.Name,
		Icon:        lo.ToPtr("mysql"),
		Type:        contract.DatabaseContainerNodeType,
		HasChildren: true,
		ContextMenu: r.ContextMenu(contract.DatabaseContainerNodeType),
		Children:    make([]contract.TreeNode, 0),
	}
	databases, err := r.databases(ctx, true)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	for _, db := range databases {
		root.Children = append(root.Children, contract.TreeNode{
			ID:          db.Name,
			Name:        db.Name,
			Type:        contract.DatabaseNodeType,
			HasChildren: true,
			Icon:        lo.ToPtr("database"),
			ContextMenu: r.ContextMenu(contract.DatabaseNodeType),
			Children:    make([]contract.TreeNode, 0),
		})
	}
	return root, nil
}

func buildDatabase(ctx context.Context, r *MySQLRepository, dbName string) (*contract.TreeNode, error) {
	dbNode := &contract.TreeNode{
		ID:          dbName,
		Name:        dbName,
		Type:        contract.DatabaseNodeType,
		HasChildren: true,
		ContextMenu: r.ContextMenu(contract.DatabaseNodeType),
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
		dbNode.Children = append(dbNode.Children, contract.TreeNode{
			ID:          fmt.Sprintf("%s.%s", dbName, c.id),
			Name:        c.name,
			Type:        c.id,
			HasChildren: true,
			ContextMenu: c.contextMenu,
			Children:    make([]contract.TreeNode, 0),
		})
	}

	return dbNode, nil
}

func buildContainer(ctx context.Context, r *MySQLRepository, dbName string, container contract.TreeNodeType) (*contract.TreeNode, error) {
	containerNode := &contract.TreeNode{
		ID:          fmt.Sprintf("%s.%s", dbName, container),
		Name:        string(container),
		Type:        container,
		HasChildren: true,
		ContextMenu: r.ContextMenu(container),
		Children:    make([]contract.TreeNode, 0),
	}

	switch container {
	case contract.TableContainerNodeType:
		tables, err := r.tables(ctx, &dbName, true)
		if err != nil {
			return nil, apperror.DriverError(err)
		}
		for _, table := range tables {
			containerNode.Children = append(containerNode.Children, contract.TreeNode{
				ID:   fmt.Sprintf("%s.%s", dbName, table.Name),
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
		views, err := r.views(ctx, &dbName, true)
		if err != nil {
			return nil, apperror.DriverError(err)
		}
		for _, view := range views {
			containerNode.Children = append(containerNode.Children, contract.TreeNode{
				ID:   fmt.Sprintf("%s.%s", dbName, view.Name),
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
