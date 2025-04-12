package databasePostgres

import (
	"fmt"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

func (r *PostgresRepository) Tree(parentID string) (*contract.TreeNode, error) {
	if parentID == "" {
		return buildRoot(r)
	}

	parts := strings.Split(parentID, ".")
	switch len(parts) {
	case 1:
		return buildDatabase(r, parts[0])
	case 2:
		return buildSchema(r, parts[0], parts[1])
	case 3:
		return buildContainer(r, parts[0], parts[1], contract.TreeNodeType(parts[2]))
	default:
		return nil, fmt.Errorf("unsupported parent_id: %s", parentID)
	}
}

func buildRoot(r *PostgresRepository) (*contract.TreeNode, error) {
	root := &contract.TreeNode{
		ID:          fmt.Sprintf("%d@database", r.connection.ID),
		Name:        r.connection.Name,
		Icon:        lo.ToPtr("postgresql"),
		Type:        contract.DatabaseContainerNodeType,
		HasChildren: true,
		ContextMenu: r.ContextMenu(contract.DatabaseContainerNodeType),
		Children:    make([]contract.TreeNode, 0),
	}
	databases, err := r.getDatabaseList()
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

func buildDatabase(r *PostgresRepository, dbName string) (*contract.TreeNode, error) {
	dbNode := &contract.TreeNode{
		ID:          dbName,
		Name:        dbName,
		Type:        contract.DatabaseNodeType,
		HasChildren: true,
		ContextMenu: r.ContextMenu(contract.DatabaseNodeType),
		Children:    make([]contract.TreeNode, 0),
	}
	schemas, err := r.getSchemaList(Database{Name: dbName})
	if err != nil {
		return nil, apperror.DriverError(err)
	}
	for _, schema := range schemas {
		dbNode.Children = append(dbNode.Children, contract.TreeNode{
			ID:          fmt.Sprintf("%s.%s", dbName, schema.Name),
			Name:        schema.Name,
			Type:        contract.SchemaNodeType,
			HasChildren: true,
			Icon:        lo.ToPtr("network"),
			ContextMenu: r.ContextMenu(contract.SchemaNodeType),
			Children:    make([]contract.TreeNode, 0),
		})
	}
	return dbNode, nil
}

func buildSchema(r *PostgresRepository, dbName, schemaName string) (*contract.TreeNode, error) {
	schemaNode := &contract.TreeNode{
		ID:          fmt.Sprintf("%s.%s", dbName, schemaName),
		Name:        schemaName,
		Type:        contract.SchemaNodeType,
		HasChildren: true,
		ContextMenu: r.ContextMenu(contract.SchemaNodeType),
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
		{
			"Materialized Views",
			contract.MaterializedViewContainerNodeType,
			r.ContextMenu(contract.MaterializedViewContainerNodeType),
		},
	}
	for _, c := range containers {
		schemaNode.Children = append(schemaNode.Children, contract.TreeNode{
			ID:          fmt.Sprintf("%s.%s.%s", dbName, schemaName, c.id),
			Name:        c.name,
			Type:        c.id,
			HasChildren: true,
			ContextMenu: c.contextMenu,
			Children:    make([]contract.TreeNode, 0),
		})
	}
	return schemaNode, nil
}

func buildContainer(r *PostgresRepository, dbName, schemaName string, container contract.TreeNodeType) (*contract.TreeNode, error) {
	containerNode := &contract.TreeNode{
		ID:          fmt.Sprintf("%s.%s.%s", dbName, schemaName, container),
		Name:        string(container),
		Type:        container,
		HasChildren: true,
		ContextMenu: r.ContextMenu(container),
		Children:    make([]contract.TreeNode, 0),
	}
	switch container {
	case contract.TableContainerNodeType:
		tables, err := r.getTableList(Schema{Name: schemaName})
		if err != nil {
			return nil, apperror.DriverError(err)
		}
		for _, table := range tables {
			containerNode.Children = append(containerNode.Children, contract.TreeNode{
				ID:   fmt.Sprintf("%s.%s.%s", dbName, schemaName, table.Name),
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
		views, err := r.getViewList(Database{Name: dbName}, Schema{Name: schemaName})
		if err != nil {
			return nil, apperror.DriverError(err)
		}
		for _, view := range views {
			containerNode.Children = append(containerNode.Children, contract.TreeNode{
				ID:   fmt.Sprintf("%s.%s.%s", dbName, schemaName, view.Name),
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
	case contract.MaterializedViewContainerNodeType:
		mvs, err := r.getMaterializedViewList(Schema{Name: schemaName})
		if err != nil {
			return nil, apperror.DriverError(err)
		}
		for _, mv := range mvs {
			containerNode.Children = append(containerNode.Children, contract.TreeNode{
				ID:   fmt.Sprintf("%s.%s.%s", dbName, schemaName, mv.Name),
				Name: mv.Name,
				Type: contract.MaterializedViewNodeType,
				Action: &contract.TreeNodeAction{
					Type: contract.TreeNodeActionTypeTab,
					Params: map[string]interface{}{
						"path":     "data",
						"table":    mv.Name,
						"editable": false,
					},
				},
				ContextMenu: r.ContextMenu(contract.MaterializedViewNodeType),
				Children:    make([]contract.TreeNode, 0),
			})
		}
	default:
		return nil, fmt.Errorf("unsupported container type: %s", container)
	}
	return containerNode, nil
}
