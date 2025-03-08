package databaseSqlserver

import (
	"fmt"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

func buildTree(r *SQLServerRepository) (*databaseContract.TreeNode, error) {
	root := &databaseContract.TreeNode{
		ID:          "root",
		Name:        "SQL Server",
		Type:        "server",
		ContextMenu: r.GetAvailableActions("root"),
	}

	// گرفتن لیست دیتابیس‌ها
	var databases []struct {
		Name string `gorm:"column:name"`
	}
	err := r.db.Raw("SELECT name FROM sys.databases").Scan(&databases).Error
	if err != nil {
		return nil, fmt.Errorf("failed to fetch databases: %v", err)
	}

	for _, db := range databases {
		dbNode := databaseContract.TreeNode{
			ID:          db.Name,
			Name:        db.Name,
			Type:        "database",
			ContextMenu: r.GetAvailableActions("database"),
			Children:    make([]databaseContract.TreeNode, 0),
		}

		// تغییر دیتابیس فعلی
		if err := r.db.Exec("USE ?", db.Name).Error; err != nil {
			return nil, fmt.Errorf("failed to switch to database %s: %v", db.Name, err)
		}

		// گره‌های ثابت برای همه نوع اشیا
		tablesNode := databaseContract.TreeNode{
			ID:   fmt.Sprintf("%s.tables", db.Name),
			Name: "Tables",
			Type: "tableContainer",
			//ContextMenu:  []string{"createTable"},
			Children: make([]databaseContract.TreeNode, 0),
		}
		viewsNode := databaseContract.TreeNode{
			ID:   fmt.Sprintf("%s.views", db.Name),
			Name: "Views",
			Type: "viewContainer",
			//ContextMenu:  []string{"createView"},
			Children: make([]databaseContract.TreeNode, 0),
		}
		indexesNode := databaseContract.TreeNode{
			ID:   fmt.Sprintf("%s.indexes", db.Name),
			Name: "Indexes",
			Type: "indexContainer",
			//ContextMenu:  []string{"createIndex"},
			Children: make([]databaseContract.TreeNode, 0),
		}
		sequencesNode := databaseContract.TreeNode{
			ID:   fmt.Sprintf("%s.sequences", db.Name),
			Name: "Sequences",
			Type: "sequenceContainer",
			//ContextMenu:  []string{"createSequence"},
			Children: make([]databaseContract.TreeNode, 0),
		}

		// گرفتن جداول
		var tables []struct {
			Name string `gorm:"column:TABLE_NAME"`
		}
		err = r.db.Raw(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            AND TABLE_CATALOG = ?
        `, db.Name).Scan(&tables).Error
		if err != nil {
			return nil, fmt.Errorf("failed to fetch tables for %s: %v", db.Name, err)
		}
		for _, table := range tables {
			tableNode := databaseContract.TreeNode{
				ID:          fmt.Sprintf("%s.dbo.%s", db.Name, table.Name),
				Name:        table.Name,
				Type:        "table",
				ContextMenu: r.GetAvailableActions("table"),
				Children:    make([]databaseContract.TreeNode, 0),
			}
			tablesNode.Children = append(tablesNode.Children, tableNode)
		}

		// گرفتن Viewها
		var views []struct {
			Name string `gorm:"column:TABLE_NAME"`
		}
		err = r.db.Raw(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.VIEWS 
            WHERE TABLE_CATALOG = ?
        `, db.Name).Scan(&views).Error
		if err != nil {
			return nil, fmt.Errorf("failed to fetch views for %s: %v", db.Name, err)
		}
		for _, view := range views {
			viewNode := databaseContract.TreeNode{
				ID:          fmt.Sprintf("%s.dbo.%s", db.Name, view.Name),
				Name:        view.Name,
				Type:        "view",
				ContextMenu: r.GetAvailableActions("view"),
				Children:    make([]databaseContract.TreeNode, 0),
			}
			viewsNode.Children = append(viewsNode.Children, viewNode)
		}

		// گرفتن Indexها
		var indexes []struct {
			Name string `gorm:"column:name"`
		}
		err = r.db.Raw(`
            SELECT DISTINCT i.name 
            FROM sys.indexes i
            JOIN sys.tables t ON i.object_id = t.object_id
            WHERE t.type = 'U'
        `).Scan(&indexes).Error
		if err != nil {
			return nil, fmt.Errorf("failed to fetch indexes for %s: %v", db.Name, err)
		}
		for _, index := range indexes {
			indexNode := databaseContract.TreeNode{
				ID:          fmt.Sprintf("%s.dbo.%s", db.Name, index.Name),
				Name:        index.Name,
				Type:        "index",
				ContextMenu: r.GetAvailableActions("index"),
				Children:    make([]databaseContract.TreeNode, 0),
			}
			indexesNode.Children = append(indexesNode.Children, indexNode)
		}

		// گرفتن Sequenceها
		var sequences []struct {
			Name string `gorm:"column:name"`
		}
		err = r.db.Raw("SELECT name FROM sys.sequences").Scan(&sequences).Error
		if err != nil {
			return nil, fmt.Errorf("failed to fetch sequences for %s: %v", db.Name, err)
		}
		for _, sequence := range sequences {
			sequenceNode := databaseContract.TreeNode{
				ID:          fmt.Sprintf("%s.dbo.%s", db.Name, sequence.Name),
				Name:        sequence.Name,
				Type:        "sequence",
				ContextMenu: r.GetAvailableActions("sequence"),
				Children:    make([]databaseContract.TreeNode, 0),
			}
			sequencesNode.Children = append(sequencesNode.Children, sequenceNode)
		}

		// اضافه کردن گره‌های ثابت به دیتابیس
		dbNode.Children = append(dbNode.Children, tablesNode, viewsNode, indexesNode, sequencesNode)
		root.Children = append(root.Children, dbNode)
	}

	return root, nil
}
