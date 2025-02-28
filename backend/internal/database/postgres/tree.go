package databasePostgres

import (
	"fmt"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

func buildRoot(r *PostgresRepository) (*contract.TreeNode, error) {
	root := &contract.TreeNode{
		ID:          fmt.Sprintf("%d@database", r.connection.ID),
		Name:        fmt.Sprintf("%d@databases", r.connection.ID),
		Type:        "database_container",
		ContextMenu: r.GetAvailableActions("database_container"),
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
			Type:        "database",
			ContextMenu: r.GetAvailableActions("database"),
			Children:    make([]contract.TreeNode, 0),
		})
	}
	return root, nil
}

func buildDatabase(r *PostgresRepository, dbName string) (*contract.TreeNode, error) {
	dbNode := &contract.TreeNode{
		ID:          dbName,
		Name:        dbName,
		Type:        "database",
		ContextMenu: r.GetAvailableActions("database"),
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
			Type:        "schema",
			ContextMenu: r.GetAvailableActions("schema"),
			Children:    make([]contract.TreeNode, 0),
		})
	}
	return dbNode, nil
}

func buildSchema(r *PostgresRepository, dbName, schemaName string) (*contract.TreeNode, error) {
	schemaNode := &contract.TreeNode{
		ID:          fmt.Sprintf("%s.%s", dbName, schemaName),
		Name:        schemaName,
		Type:        "schema",
		ContextMenu: r.GetAvailableActions("schema"),
		Children:    make([]contract.TreeNode, 0),
	}
	containers := []struct {
		id          string
		name        string
		contextMenu []contract.TreeNodeAction
	}{
		{"tables", "Tables", r.GetAvailableActions("table")},
		{"views", "Views", r.GetAvailableActions("view")},
		{"materialized_views", "Materialized Views", r.GetAvailableActions("materialized_view")},
		{"indexes", "Indexes", r.GetAvailableActions("index")},
		{"sequences", "Sequences", r.GetAvailableActions("sequence")},
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

func buildContainer(r *PostgresRepository, dbName, schemaName, container string) (*contract.TreeNode, error) {
	containerNode := &contract.TreeNode{
		ID:          fmt.Sprintf("%s.%s.%s", dbName, schemaName, container),
		Name:        strings.TrimSuffix(container, "s"),
		Type:        container,
		ContextMenu: r.GetAvailableActions(container),
		Children:    make([]contract.TreeNode, 0),
	}
	switch container {
	case "tables":
		tables, err := r.getTableList(Schema{Name: schemaName})
		if err != nil {
			return nil, apperror.DriverError(err)
		}
		for _, table := range tables {
			if table.Name == "" {
				continue
			}
			containerNode.Children = append(containerNode.Children, contract.TreeNode{
				ID:   fmt.Sprintf("%s.%s.%s", dbName, schemaName, table.Name),
				Name: table.Name,
				Type: "table",
				Action: &contract.TreeNodeAction{
					Name: "",
					Type: contract.TreeNodeActionTypeRoute,
					Params: map[string]interface{}{
						"path": "data",
						"id":   fmt.Sprintf("%s.%s.%s", dbName, schemaName, table.Name),
					},
				},
				ContextMenu: r.GetAvailableActions("table"),
				Children:    make([]contract.TreeNode, 0),
			})
		}
	case "views":
		views, err := r.getViewList(Database{Name: dbName}, Schema{Name: schemaName})
		if err != nil {
			return nil, apperror.DriverError(err)
		}
		for _, view := range views {
			containerNode.Children = append(containerNode.Children, contract.TreeNode{
				ID:          fmt.Sprintf("%s.%s.%s", dbName, schemaName, view.Name),
				Name:        view.Name,
				Type:        "view",
				ContextMenu: r.GetAvailableActions("view"),
				Children:    make([]contract.TreeNode, 0),
			})
		}
	case "materialized_views":
		mvs, err := r.getMaterializedViewList(Schema{Name: schemaName})
		if err != nil {
			return nil, apperror.DriverError(err)
		}
		for _, mv := range mvs {
			containerNode.Children = append(containerNode.Children, contract.TreeNode{
				ID:          fmt.Sprintf("%s.%s.%s", dbName, schemaName, mv.Name),
				Name:        mv.Name,
				Type:        "materialized_view",
				ContextMenu: r.GetAvailableActions("materialized_view"),
				Children:    make([]contract.TreeNode, 0),
			})
		}
	case "indexes":
		indexes, err := r.getIndexList(Schema{Name: schemaName})
		if err != nil {
			return nil, apperror.DriverError(err)
		}
		for _, index := range indexes {
			containerNode.Children = append(containerNode.Children, contract.TreeNode{
				ID:          fmt.Sprintf("%s.%s.%s", dbName, schemaName, index.Name),
				Name:        index.Name,
				Type:        "index",
				ContextMenu: r.GetAvailableActions("index"),
				Children:    make([]contract.TreeNode, 0),
			})
		}
	case "sequences":
		sequences, err := r.getSequenceList(Schema{Name: schemaName})
		if err != nil {
			return nil, apperror.DriverError(err)
		}
		for _, sequence := range sequences {
			containerNode.Children = append(containerNode.Children, contract.TreeNode{
				ID:          fmt.Sprintf("%s.%s.%s", dbName, schemaName, sequence.Name),
				Name:        sequence.Name,
				Type:        "sequence",
				ContextMenu: r.GetAvailableActions("sequence"),
				Children:    make([]contract.TreeNode, 0),
			})
		}
	default:
		return nil, fmt.Errorf("unsupported container type: %s", container)
	}
	return containerNode, nil
}

func buildTree(r *PostgresRepository, parentID string) (*contract.TreeNode, error) {
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
		return buildContainer(r, parts[0], parts[1], parts[2])
	default:
		return nil, fmt.Errorf("unsupported parent_id: %s", parentID)
	}
}
