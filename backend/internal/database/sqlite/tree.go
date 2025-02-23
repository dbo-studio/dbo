package databaseSqlite

import (
	"fmt"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

func buildTree(r *SQLiteRepository) (*databaseContract.TreeNode, error) {
	root := &databaseContract.TreeNode{
		ID:       r.connID,
		Name:     "SQLite DB",
		Type:     "database",
		Actions:  r.GetAvailableActions("database"),
		Children: make([]databaseContract.TreeNode, 0),
	}

	// گره‌های ثابت برای همه نوع اشیا
	tablesNode := databaseContract.TreeNode{
		ID:       fmt.Sprintf("%s.tables", r.connID),
		Name:     "Tables",
		Type:     "table_container",
		Actions:  []string{"create_table"},
		Children: make([]databaseContract.TreeNode, 0),
	}
	viewsNode := databaseContract.TreeNode{
		ID:       fmt.Sprintf("%s.views", r.connID),
		Name:     "Views",
		Type:     "view_container",
		Actions:  []string{"create_view"},
		Children: make([]databaseContract.TreeNode, 0),
	}
	indexesNode := databaseContract.TreeNode{
		ID:       fmt.Sprintf("%s.indexes", r.connID),
		Name:     "Indexes",
		Type:     "index_container",
		Actions:  []string{"create_index"},
		Children: make([]databaseContract.TreeNode, 0),
	}

	// گرفتن اشیای واقعی از sqlite_master
	var objects []struct {
		Name string `gorm:"column:name"`
		Type string `gorm:"column:type"`
	}
	err := r.db.Raw("SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view', 'index')").Scan(&objects).Error
	if err != nil {
		return nil, err
	}

	for _, obj := range objects {
		node := databaseContract.TreeNode{
			ID:      obj.Name,
			Name:    obj.Name,
			Type:    obj.Type,
			Actions: r.GetAvailableActions(obj.Type),
		}
		switch obj.Type {
		case "table":
			tablesNode.Children = append(tablesNode.Children, node)
		case "view":
			viewsNode.Children = append(viewsNode.Children, node)
		case "index":
			indexesNode.Children = append(indexesNode.Children, node)
		}
	}

	// اضافه کردن همه گره‌های ثابت به root
	root.Children = append(root.Children, tablesNode, viewsNode, indexesNode)
	return root, nil
}
