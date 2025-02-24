package databasePostgres

import (
	"fmt"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

func buildTree(r *PostgresRepository) (*databaseContract.TreeNode, error) {
	root := &databaseContract.TreeNode{
		ID:       fmt.Sprintf("%s@database", r.connectionInfo.ID),
		Name:     fmt.Sprintf("%s@databases", r.connectionInfo.ID),
		Type:     "database_container",
		Actions:  r.GetAvailableActions("database"),
		Children: make([]databaseContract.TreeNode, 0),
	}

	databases, err := r.getDatabaseList()
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	for _, db := range databases {
		dbNode := databaseContract.TreeNode{
			ID:       db.Name,
			Name:     db.Name,
			Type:     "database",
			Actions:  r.GetAvailableActions("database"),
			Children: make([]databaseContract.TreeNode, 0),
		}

		schemas, err := r.getSchemaList(db)
		if err != nil {
			return nil, apperror.DriverError(err)
		}

		for _, schema := range schemas {
			schemaNode := databaseContract.TreeNode{
				ID:       fmt.Sprintf("%s.%s", db.Name, schema.Name),
				Name:     schema.Name,
				Type:     "schema",
				Actions:  r.GetAvailableActions("schema"),
				Children: make([]databaseContract.TreeNode, 0),
			}
			tablesNode := databaseContract.TreeNode{
				ID:       fmt.Sprintf("%s.%s.tables", db.Name, schema.Name),
				Name:     "Tables",
				Type:     "table_container",
				Actions:  []string{"create_table"},
				Children: make([]databaseContract.TreeNode, 0),
			}
			viewsNode := databaseContract.TreeNode{
				ID:       fmt.Sprintf("%s.%s.views", db.Name, schema.Name),
				Name:     "Views",
				Type:     "view_container",
				Actions:  []string{"create_view"},
				Children: make([]databaseContract.TreeNode, 0),
			}
			matViewsNode := databaseContract.TreeNode{
				ID:       fmt.Sprintf("%s.%s.materialized_views", db.Name, schema.Name),
				Name:     "Materialized Views",
				Type:     "materialized_view_container",
				Actions:  []string{"create_materialized_view"},
				Children: make([]databaseContract.TreeNode, 0),
			}
			indexesNode := databaseContract.TreeNode{
				ID:       fmt.Sprintf("%s.%s.indexes", db.Name, schema.Name),
				Name:     "Indexes",
				Type:     "index_container",
				Actions:  []string{"create_index"},
				Children: make([]databaseContract.TreeNode, 0),
			}
			sequencesNode := databaseContract.TreeNode{
				ID:       fmt.Sprintf("%s.%s.sequences", db.Name, schema.Name),
				Name:     "Sequences",
				Type:     "sequence_container",
				Actions:  []string{"create_sequence"},
				Children: make([]databaseContract.TreeNode, 0),
			}

			tables, err := r.getTableList(schema)
			if err != nil {
				return nil, apperror.DriverError(err)
			}
			for _, table := range tables {
				tableNode := databaseContract.TreeNode{
					ID:       fmt.Sprintf("%s.%s.%s", db.Name, schema.Name, table.Name),
					Name:     table.Name,
					Type:     "table",
					Actions:  r.GetAvailableActions("table"),
					Children: make([]databaseContract.TreeNode, 0),
				}
				tablesNode.Children = append(tablesNode.Children, tableNode)
			}

			views, err := r.getViewList(db)
			if err != nil {
				return nil, apperror.DriverError(err)
			}
			for _, view := range views {
				viewNode := databaseContract.TreeNode{
					ID:       fmt.Sprintf("%s.%s.%s", db.Name, schema.Name, view.Name),
					Name:     view.Name,
					Type:     "view",
					Actions:  r.GetAvailableActions("view"),
					Children: make([]databaseContract.TreeNode, 0),
				}
				viewsNode.Children = append(viewsNode.Children, viewNode)
			}

			matViews, err := r.getMaterializedViewList(schema)
			if err != nil {
				return nil, apperror.DriverError(err)
			}
			for _, matView := range matViews {
				matViewChild := databaseContract.TreeNode{
					ID:       fmt.Sprintf("%s.%s.%s", db.Name, schema.Name, matView.Name),
					Name:     matView.Name,
					Type:     "materialized_view",
					Actions:  r.GetAvailableActions("materialized_view"),
					Children: make([]databaseContract.TreeNode, 0),
				}
				matViewsNode.Children = append(matViewsNode.Children, matViewChild)
			}

			indexes, err := r.getIndexList(schema)
			if err != nil {
				return nil, apperror.DriverError(err)
			}
			for _, index := range indexes {
				indexNode := databaseContract.TreeNode{
					ID:       fmt.Sprintf("%s.%s.%s", db.Name, schema.Name, index.Name),
					Name:     index.Name,
					Type:     "index",
					Actions:  r.GetAvailableActions("index"),
					Children: make([]databaseContract.TreeNode, 0),
				}
				indexesNode.Children = append(indexesNode.Children, indexNode)
			}

			sequences, err := r.getSequenceList(schema)
			if err != nil {
				return nil, apperror.DriverError(err)
			}
			for _, sequence := range sequences {
				sequenceNode := databaseContract.TreeNode{
					ID:       fmt.Sprintf("%s.%s.%s", db.Name, schema.Name, sequence.Name),
					Name:     sequence.Name,
					Type:     "sequence",
					Actions:  r.GetAvailableActions("sequence"),
					Children: make([]databaseContract.TreeNode, 0),
				}
				sequencesNode.Children = append(sequencesNode.Children, sequenceNode)
			}

			schemaNode.Children = append(schemaNode.Children, tablesNode, viewsNode, matViewsNode, indexesNode, sequencesNode)
			dbNode.Children = append(dbNode.Children, schemaNode)
		}

		root.Children = append(root.Children, dbNode)
	}

	return root, nil
}
