package databaseMysql

import (
	"fmt"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

func buildTree(r *MySQLRepository) (*databaseContract.TreeNode, error) {
	root := &databaseContract.TreeNode{
		ID:      "root",
		Name:    "MySQL Server",
		Type:    "server",
		Actions: r.GetAvailableActions("root"),
	}

	// گرفتن لیست دیتابیس‌ها
	var databases []struct {
		Name string `gorm:"column:Database"`
	}
	err := r.db.Raw("SHOW DATABASES").Scan(&databases).Error
	if err != nil {
		return nil, fmt.Errorf("failed to fetch databases: %v", err)
	}

	for _, db := range databases {
		dbNode := databaseContract.TreeNode{
			ID:       db.Name,
			Name:     db.Name,
			Type:     "database",
			Actions:  r.GetAvailableActions("database"),
			Children: make([]databaseContract.TreeNode, 0),
		}

		// گره‌های ثابت برای همه نوع اشیا
		tablesNode := databaseContract.TreeNode{
			ID:       fmt.Sprintf("%s.tables", db.Name),
			Name:     "Tables",
			Type:     "table_container",
			Actions:  []string{"create_table"},
			Children: make([]databaseContract.TreeNode, 0),
		}
		viewsNode := databaseContract.TreeNode{
			ID:       fmt.Sprintf("%s.views", db.Name),
			Name:     "Views",
			Type:     "view_container",
			Actions:  []string{"create_view"},
			Children: make([]databaseContract.TreeNode, 0),
		}
		indexesNode := databaseContract.TreeNode{
			ID:       fmt.Sprintf("%s.indexes", db.Name),
			Name:     "Indexes",
			Type:     "index_container",
			Actions:  []string{"create_index"},
			Children: make([]databaseContract.TreeNode, 0),
		}

		// تغییر دیتابیس فعلی
		if err := r.db.Exec("USE ?", db.Name).Error; err != nil {
			return nil, fmt.Errorf("failed to switch to database %s: %v", db.Name, err)
		}

		// گرفتن جداول
		var tables []struct {
			Name string `gorm:"column:TABLE_NAME"`
		}
		err = r.db.Raw("SHOW TABLES").Scan(&tables).Error
		if err != nil {
			return nil, fmt.Errorf("failed to fetch tables for %s: %v", db.Name, err)
		}
		for _, table := range tables {
			tableNode := databaseContract.TreeNode{
				ID:       fmt.Sprintf("%s.%s", db.Name, table.Name),
				Name:     table.Name,
				Type:     "table",
				Actions:  r.GetAvailableActions("table"),
				Children: make([]databaseContract.TreeNode, 0),
			}
			tablesNode.Children = append(tablesNode.Children, tableNode)
		}

		// گرفتن Viewها
		var views []struct {
			Name string `gorm:"column:TABLE_NAME"`
		}
		err = r.db.Raw(`
            SELECT TABLE_NAME 
            FROM information_schema.views 
            WHERE TABLE_SCHEMA = ?
        `, db.Name).Scan(&views).Error
		if err != nil {
			return nil, fmt.Errorf("failed to fetch views for %s: %v", db.Name, err)
		}
		for _, view := range views {
			viewNode := databaseContract.TreeNode{
				ID:       fmt.Sprintf("%s.%s", db.Name, view.Name),
				Name:     view.Name,
				Type:     "view",
				Actions:  r.GetAvailableActions("view"),
				Children: make([]databaseContract.TreeNode, 0),
			}
			viewsNode.Children = append(viewsNode.Children, viewNode)
		}

		// گرفتن Indexها (به‌صورت ساده، فقط نام‌ها)
		var indexes []struct {
			Name string `gorm:"column:INDEX_NAME"`
		}
		err = r.db.Raw(`
            SELECT DISTINCT INDEX_NAME 
            FROM information_schema.statistics 
            WHERE TABLE_SCHEMA = ?
        `, db.Name).Scan(&indexes).Error
		if err != nil {
			return nil, fmt.Errorf("failed to fetch indexes for %s: %v", db.Name, err)
		}
		for _, index := range indexes {
			indexNode := databaseContract.TreeNode{
				ID:       fmt.Sprintf("%s.%s", db.Name, index.Name),
				Name:     index.Name,
				Type:     "index",
				Actions:  r.GetAvailableActions("index"),
				Children: make([]databaseContract.TreeNode, 0),
			}
			indexesNode.Children = append(indexesNode.Children, indexNode)
		}

		// اضافه کردن گره‌های ثابت به دیتابیس
		dbNode.Children = append(dbNode.Children, tablesNode, viewsNode, indexesNode)
		root.Children = append(root.Children, dbNode)
	}

	return root, nil
}
