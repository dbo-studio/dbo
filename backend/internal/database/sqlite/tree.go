package databaseSqlite

import (
	"fmt"
	"strconv"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

func buildTree(r *SQLiteRepository) (*databaseContract.TreeNode, error) {
	root := &databaseContract.TreeNode{
		ID:          strconv.Itoa(int(r.connection.ID)),
		Name:        "SQLite DB",
		Type:        "database",
		ContextMenu: r.GetAvailableActions("database"),
		Children:    make([]databaseContract.TreeNode, 0),
	}

	// گره‌های ثابت برای همه نوع اشیا
	tablesNode := databaseContract.TreeNode{
		ID:   fmt.Sprintf("%d.tables", r.connection.ID),
		Name: "Tables",
		Type: "tableContainer",
		//ContextMenu:  []string{"createTable"},
		Children: make([]databaseContract.TreeNode, 0),
	}
	viewsNode := databaseContract.TreeNode{
		ID:   fmt.Sprintf("%d.views", r.connection.ID),
		Name: "Views",
		Type: "viewContainer",
		//ContextMenu:  []string{"createView"},
		Children: make([]databaseContract.TreeNode, 0),
	}
	indexesNode := databaseContract.TreeNode{
		ID:   fmt.Sprintf("%d.indexes", r.connection.ID),
		Name: "Indexes",
		Type: "indexContainer",
		//ContextMenu:  []string{"createIndex"},
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
			ID:          obj.Name,
			Name:        obj.Name,
			Type:        obj.Type,
			ContextMenu: r.GetAvailableActions(obj.Type),
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
