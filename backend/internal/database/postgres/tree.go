package databasePostgres

import (
	"fmt"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

func buildTree(r *PostgresRepository) (*databaseContract.TreeNode, error) {
	root := &databaseContract.TreeNode{
		ID:      "root",
		Label:   "PostgreSQL Server",
		Type:    "server",
		Actions: r.GetAvailableActions("root"),
	}

	// گرفتن لیست دیتابیس‌ها
	var databases []struct {
		Name string `gorm:"column:datname"`
	}
	err := r.db.Raw("SELECT datname FROM pg_database WHERE datistemplate = false").Scan(&databases).Error
	if err != nil {
		return nil, fmt.Errorf("failed to fetch databases: %v", err)
	}

	for _, db := range databases {
		dbNode := databaseContract.TreeNode{
			ID:      db.Name,
			Label:   db.Name,
			Type:    "database",
			Actions: r.GetAvailableActions("database"),
		}

		// گرفتن لیست اسکیماها
		var schemas []struct {
			Name string `gorm:"column:schema_name"`
		}
		err = r.db.Raw(`
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE catalog_name = ? 
            AND schema_name NOT IN ('pg_catalog', 'information_schema')
        `, db.Name).Scan(&schemas).Error
		if err != nil {
			return nil, fmt.Errorf("failed to fetch schemas for %s: %v", db.Name, err)
		}

		for _, schema := range schemas {
			schemaNode := databaseContract.TreeNode{
				ID:       fmt.Sprintf("%s.%s", db.Name, schema.Name),
				Label:    schema.Name,
				Type:     "schema",
				Actions:  r.GetAvailableActions("schema"),
				Children: make([]databaseContract.TreeNode, 0),
			}

			// گره‌های ثابت برای همه نوع اشیا
			tablesNode := databaseContract.TreeNode{
				ID:       fmt.Sprintf("%s.%s.tables", db.Name, schema.Name),
				Label:    "Tables",
				Type:     "table_container",
				Actions:  []string{"create_table"},
				Children: make([]databaseContract.TreeNode, 0),
			}
			viewsNode := databaseContract.TreeNode{
				ID:       fmt.Sprintf("%s.%s.views", db.Name, schema.Name),
				Label:    "Views",
				Type:     "view_container",
				Actions:  []string{"create_view"},
				Children: make([]databaseContract.TreeNode, 0),
			}
			matViewsNode := databaseContract.TreeNode{
				ID:       fmt.Sprintf("%s.%s.materialized_views", db.Name, schema.Name),
				Label:    "Materialized Views",
				Type:     "materialized_view_container",
				Actions:  []string{"create_materialized_view"},
				Children: make([]databaseContract.TreeNode, 0),
			}
			indexesNode := databaseContract.TreeNode{
				ID:       fmt.Sprintf("%s.%s.indexes", db.Name, schema.Name),
				Label:    "Indexes",
				Type:     "index_container",
				Actions:  []string{"create_index"},
				Children: make([]databaseContract.TreeNode, 0),
			}
			sequencesNode := databaseContract.TreeNode{
				ID:       fmt.Sprintf("%s.%s.sequences", db.Name, schema.Name),
				Label:    "Sequences",
				Type:     "sequence_container",
				Actions:  []string{"create_sequence"},
				Children: make([]databaseContract.TreeNode, 0),
			}

			// گرفتن جداول
			var tables []struct {
				Name string `gorm:"column:table_name"`
			}
			err = r.db.Raw(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_catalog = ? 
                AND table_schema = ?
            `, db.Name, schema.Name).Scan(&tables).Error
			if err != nil {
				return nil, fmt.Errorf("failed to fetch tables for %s.%s: %v", db.Name, schema.Name, err)
			}
			for _, table := range tables {
				tableNode := databaseContract.TreeNode{
					ID:      fmt.Sprintf("%s.%s.%s", db.Name, schema.Name, table.Name),
					Label:   table.Name,
					Type:    "table",
					Actions: r.GetAvailableActions("table"),
				}
				tablesNode.Children = append(tablesNode.Children, tableNode)
			}

			// گرفتن Viewها
			var views []struct {
				Name string `gorm:"column:table_name"`
			}
			err = r.db.Raw(`
                SELECT table_name 
                FROM information_schema.views 
                WHERE table_catalog = ? 
                AND table_schema = ?
            `, db.Name, schema.Name).Scan(&views).Error
			if err != nil {
				return nil, fmt.Errorf("failed to fetch views for %s.%s: %v", db.Name, schema.Name, err)
			}
			for _, view := range views {
				viewNode := databaseContract.TreeNode{
					ID:      fmt.Sprintf("%s.%s.%s", db.Name, schema.Name, view.Name),
					Label:   view.Name,
					Type:    "view",
					Actions: r.GetAvailableActions("view"),
				}
				viewsNode.Children = append(viewsNode.Children, viewNode)
			}

			// گرفتن Materialized Viewها
			var matViews []struct {
				Name string `gorm:"column:matviewname"`
			}
			err = r.db.Raw(`
                SELECT matviewname 
                FROM pg_matviews 
                WHERE schemaname = ?
            `, schema.Name).Scan(&matViews).Error
			if err != nil {
				return nil, fmt.Errorf("failed to fetch materialized views for %s.%s: %v", db.Name, schema.Name, err)
			}
			for _, matView := range matViews {
				matViewChild := databaseContract.TreeNode{
					ID:      fmt.Sprintf("%s.%s.%s", db.Name, schema.Name, matView.Name),
					Label:   matView.Name,
					Type:    "materialized_view",
					Actions: r.GetAvailableActions("materialized_view"),
				}
				matViewsNode.Children = append(matViewsNode.Children, matViewChild)
			}

			// گرفتن Indexها
			var indexes []struct {
				Name string `gorm:"column:indexname"`
			}
			err = r.db.Raw(`
                SELECT indexname 
                FROM pg_indexes 
                WHERE schemaname = ?
            `, schema.Name).Scan(&indexes).Error
			if err != nil {
				return nil, fmt.Errorf("failed to fetch indexes for %s.%s: %v", db.Name, schema.Name, err)
			}
			for _, index := range indexes {
				indexNode := databaseContract.TreeNode{
					ID:      fmt.Sprintf("%s.%s.%s", db.Name, schema.Name, index.Name),
					Label:   index.Name,
					Type:    "index",
					Actions: r.GetAvailableActions("index"),
				}
				indexesNode.Children = append(indexesNode.Children, indexNode)
			}

			// گرفتن Sequenceها
			var sequences []struct {
				Name string `gorm:"column:sequencename"`
			}
			err = r.db.Raw(`
                SELECT sequencename 
                FROM pg_sequences 
                WHERE schemaname = ?
            `, schema.Name).Scan(&sequences).Error
			if err != nil {
				return nil, fmt.Errorf("failed to fetch sequences for %s.%s: %v", db.Name, schema.Name, err)
			}
			for _, sequence := range sequences {
				sequenceNode := databaseContract.TreeNode{
					ID:      fmt.Sprintf("%s.%s.%s", db.Name, schema.Name, sequence.Name),
					Label:   sequence.Name,
					Type:    "sequence",
					Actions: r.GetAvailableActions("sequence"),
				}
				sequencesNode.Children = append(sequencesNode.Children, sequenceNode)
			}

			// اضافه کردن همه گره‌های ثابت به اسکیما
			schemaNode.Children = append(schemaNode.Children, tablesNode, viewsNode, matViewsNode, indexesNode, sequencesNode)
			dbNode.Children = append(dbNode.Children, schemaNode)
		}

		root.Children = append(root.Children, dbNode)
	}

	return root, nil
}
