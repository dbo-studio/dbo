package databasePostgres

import (
	"fmt"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
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
		Name:        fmt.Sprintf("%d@databases", r.connection.ID),
		Type:        contract.DatabaseContainerNodeType,
		ContextMenu: r.Actions(contract.DatabaseContainerNodeType),
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
			ContextMenu: r.Actions(contract.DatabaseNodeType),
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
		ContextMenu: r.Actions(contract.DatabaseNodeType),
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
			ContextMenu: r.Actions(contract.SchemaNodeType),
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
		ContextMenu: r.Actions(contract.SchemaNodeType),
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
			r.Actions(contract.TableContainerNodeType),
		},
		{
			"Views",
			contract.ViewContainerNodeType,
			r.Actions(contract.ViewContainerNodeType),
		},
		{
			"Materialized Views",
			contract.MaterializedViewContainerNodeType,
			r.Actions(contract.MaterializedViewContainerNodeType),
		},
		{
			"Indexes",
			contract.IndexContainerNodeType,
			r.Actions(contract.IndexContainerNodeType),
		},
		{
			"Sequences",
			contract.SequenceContainerNodeType,
			r.Actions(contract.SequenceContainerNodeType),
		},
	}
	for _, c := range containers {
		schemaNode.Children = append(schemaNode.Children, contract.TreeNode{
			ID:          fmt.Sprintf("%s.%s.%s", dbName, schemaName, c.id),
			Name:        c.name,
			Type:        c.id,
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
		ContextMenu: r.Actions(container),
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
				Type: contract.TableNodeType,
				Action: &contract.TreeNodeAction{
					Name: "",
					Type: contract.TreeNodeActionTypeTab,
					Params: map[string]interface{}{
						"path":  "data",
						"table": table.Name,
					},
				},
				ContextMenu: r.Actions(contract.TableNodeType),
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
				ID:          fmt.Sprintf("%s.%s.%s", dbName, schemaName, view.Name),
				Name:        view.Name,
				Type:        contract.ViewNodeType,
				ContextMenu: r.Actions(contract.ViewNodeType),
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
				ID:          fmt.Sprintf("%s.%s.%s", dbName, schemaName, mv.Name),
				Name:        mv.Name,
				Type:        contract.MaterializedViewNodeType,
				ContextMenu: r.Actions(contract.MaterializedViewNodeType),
				Children:    make([]contract.TreeNode, 0),
			})
		}
	case contract.IndexContainerNodeType:
		indexes, err := r.getIndexList(Schema{Name: schemaName})
		if err != nil {
			return nil, apperror.DriverError(err)
		}
		for _, index := range indexes {
			containerNode.Children = append(containerNode.Children, contract.TreeNode{
				ID:          fmt.Sprintf("%s.%s.%s", dbName, schemaName, index.Name),
				Name:        index.Name,
				Type:        contract.TableNodeType,
				ContextMenu: r.Actions(contract.TableNodeType),
				Children:    make([]contract.TreeNode, 0),
			})
		}
	case contract.SequenceContainerNodeType:
		sequences, err := r.getSequenceList(Schema{Name: schemaName})
		if err != nil {
			return nil, apperror.DriverError(err)
		}
		for _, sequence := range sequences {
			containerNode.Children = append(containerNode.Children, contract.TreeNode{
				ID:          fmt.Sprintf("%s.%s.%s", dbName, schemaName, sequence.Name),
				Name:        sequence.Name,
				Type:        contract.SequenceNodeType,
				ContextMenu: r.Actions(contract.SequenceNodeType),
				Children:    make([]contract.TreeNode, 0),
			})
		}
	default:
		return nil, fmt.Errorf("unsupported container type: %s", container)
	}
	return containerNode, nil
}
