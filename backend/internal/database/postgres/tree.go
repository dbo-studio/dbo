package databasePostgres

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

func buildRoot(r *PostgresRepository) (*databaseContract.TreeNode, error) {
	root := &databaseContract.TreeNode{
		ID:       fmt.Sprintf("%d@database", r.connection.ID),
		Name:     fmt.Sprintf("%d@databases", r.connection.ID),
		Type:     "database_container",
		Actions:  r.GetAvailableActions("database_container"),
		Children: make([]databaseContract.TreeNode, 0),
	}
	databases, err := r.getDatabaseList()
	if err != nil {
		return nil, apperror.DriverError(err)
	}
	for _, db := range databases {
		root.Children = append(root.Children, databaseContract.TreeNode{
			ID:       db.Name,
			Name:     db.Name,
			Type:     "database",
			Actions:  r.GetAvailableActions("database"),
			Children: make([]databaseContract.TreeNode, 0),
		})
	}
	return root, nil
}

func buildDatabase(r *PostgresRepository, dbName string) (*databaseContract.TreeNode, error) {
	dbNode := &databaseContract.TreeNode{
		ID:       dbName,
		Name:     dbName,
		Type:     "database",
		Actions:  r.GetAvailableActions("database"),
		Children: make([]databaseContract.TreeNode, 0),
	}
	schemas, err := r.getSchemaList(Database{Name: dbName})
	if err != nil {
		return nil, apperror.DriverError(err)
	}
	for _, schema := range schemas {
		dbNode.Children = append(dbNode.Children, databaseContract.TreeNode{
			ID:       fmt.Sprintf("%s.%s", dbName, schema.Name),
			Name:     schema.Name,
			Type:     "schema",
			Actions:  r.GetAvailableActions("schema"),
			Children: make([]databaseContract.TreeNode, 0),
		})
	}
	return dbNode, nil
}

func buildSchema(r *PostgresRepository, dbName, schemaName string) (*databaseContract.TreeNode, error) {
	schemaNode := &databaseContract.TreeNode{
		ID:       fmt.Sprintf("%s.%s", dbName, schemaName),
		Name:     schemaName,
		Type:     "schema",
		Actions:  r.GetAvailableActions("schema"),
		Children: make([]databaseContract.TreeNode, 0),
	}
	containers := []struct {
		id   string
		name string
		act  string
	}{
		{"tables", "Tables", "create_table"},
		{"views", "Views", "create_view"},
		{"materialized_views", "Materialized Views", "create_materialized_view"},
		{"indexes", "Indexes", "create_index"},
		{"sequences", "Sequences", "create_sequence"},
	}
	for _, c := range containers {
		schemaNode.Children = append(schemaNode.Children, databaseContract.TreeNode{
			ID:       fmt.Sprintf("%s.%s.%s", dbName, schemaName, c.id),
			Name:     c.name,
			Type:     c.id,
			Actions:  []string{c.act},
			Children: make([]databaseContract.TreeNode, 0),
		})
	}
	return schemaNode, nil
}

func buildContainer(r *PostgresRepository, dbName, schemaName, container string) (*databaseContract.TreeNode, error) {
	containerNode := &databaseContract.TreeNode{
		ID:       fmt.Sprintf("%s.%s.%s", dbName, schemaName, container),
		Name:     strings.TrimSuffix(container, "s"),
		Type:     container,
		Actions:  r.GetAvailableActions(container),
		Children: make([]databaseContract.TreeNode, 0),
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
			containerNode.Children = append(containerNode.Children, databaseContract.TreeNode{
				ID:       fmt.Sprintf("%s.%s.%s", dbName, schemaName, table.Name),
				Name:     table.Name,
				Type:     "table",
				Actions:  r.GetAvailableActions("table"),
				Children: make([]databaseContract.TreeNode, 0),
			})
		}
	case "views":
		views, err := r.getViewList(Database{Name: dbName}, Schema{Name: schemaName})
		if err != nil {
			return nil, apperror.DriverError(err)
		}
		for _, view := range views {
			containerNode.Children = append(containerNode.Children, databaseContract.TreeNode{
				ID:       fmt.Sprintf("%s.%s.%s", dbName, schemaName, view.Name),
				Name:     view.Name,
				Type:     "view",
				Actions:  r.GetAvailableActions("view"),
				Children: make([]databaseContract.TreeNode, 0),
			})
		}
	case "materialized_views":
		mvs, err := r.getMaterializedViewList(Schema{Name: schemaName})
		if err != nil {
			return nil, apperror.DriverError(err)
		}
		for _, mv := range mvs {
			containerNode.Children = append(containerNode.Children, databaseContract.TreeNode{
				ID:       fmt.Sprintf("%s.%s.%s", dbName, schemaName, mv.Name),
				Name:     mv.Name,
				Type:     "materialized_view",
				Actions:  r.GetAvailableActions("materialized_view"),
				Children: make([]databaseContract.TreeNode, 0),
			})
		}
	case "indexes":
		indexes, err := r.getIndexList(Schema{Name: schemaName})
		if err != nil {
			return nil, apperror.DriverError(err)
		}
		for _, index := range indexes {
			containerNode.Children = append(containerNode.Children, databaseContract.TreeNode{
				ID:       fmt.Sprintf("%s.%s.%s", dbName, schemaName, index.Name),
				Name:     index.Name,
				Type:     "index",
				Actions:  r.GetAvailableActions("index"),
				Children: make([]databaseContract.TreeNode, 0),
			})
		}
	case "sequences":
		sequences, err := r.getSequenceList(Schema{Name: schemaName})
		if err != nil {
			return nil, apperror.DriverError(err)
		}
		for _, sequence := range sequences {
			containerNode.Children = append(containerNode.Children, databaseContract.TreeNode{
				ID:       fmt.Sprintf("%s.%s.%s", dbName, schemaName, sequence.Name),
				Name:     sequence.Name,
				Type:     "sequence",
				Actions:  r.GetAvailableActions("sequence"),
				Children: make([]databaseContract.TreeNode, 0),
			})
		}
	default:
		return nil, fmt.Errorf("unsupported container type: %s", container)
	}
	return containerNode, nil
}

func buildTree(r *PostgresRepository, parentID string) (*databaseContract.TreeNode, error) {
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
