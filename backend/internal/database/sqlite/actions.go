package databaseSqlite

import (
	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *SQLiteRepository) ContextMenu(nodeType contract.TreeNodeType) []contract.TreeNodeAction {
	actions := make([]contract.TreeNodeAction, 0)
	defaultActions := []contract.TreeNodeAction{
		{
			Title: "Copy name",
			Name:  contract.CopyNameAction,
			Type:  contract.TreeNodeActionTypeCommand,
		},
		{
			Title: "Refresh",
			Name:  contract.RefreshAction,
			Type:  contract.TreeNodeActionTypeCommand,
		},
	}

	// switch nodeType {
	// case contract.TableContainerNodeType:
	// 	actions = append(actions,
	// 		contract.TreeNodeAction{
	// 			Title: "Create table",
	// 			Name:  contract.CreateTableAction,
	// 			Type:  contract.TreeNodeActionTypeTab,
	// 			Params: map[string]any{
	// 				"path": "object",
	// 			},
	// 		},
	// 	)

	// case contract.TableNodeType:
	// 	actions = append(actions,
	// 		contract.TreeNodeAction{
	// 			Title: "Edit table",
	// 			Name:  contract.EditTableAction,
	// 			Type:  contract.TreeNodeActionTypeTab,
	// 			Params: map[string]any{
	// 				"path": "object-detail",
	// 			},
	// 		},
	// 		contract.TreeNodeAction{
	// 			Title: "Drop table",
	// 			Name:  contract.DropTableAction,
	// 			Type:  contract.TreeNodeActionTypeAction,
	// 		},
	// 	)

	// case contract.ViewContainerNodeType:
	// 	actions = append(actions,
	// 		contract.TreeNodeAction{
	// 			Title: "Create view",
	// 			Name:  contract.CreateViewAction,
	// 			Type:  contract.TreeNodeActionTypeTab,
	// 			Params: map[string]any{
	// 				"path": "object",
	// 			},
	// 		},
	// 	)
	// case contract.ViewNodeType:
	// 	actions = append(actions,
	// 		contract.TreeNodeAction{
	// 			Title: "Edit view",
	// 			Name:  contract.EditViewAction,
	// 			Type:  contract.TreeNodeActionTypeTab,
	// 			Params: map[string]any{
	// 				"path": "object-detail",
	// 			},
	// 		},
	// 		contract.TreeNodeAction{
	// 			Title: "Drop view",
	// 			Name:  contract.DropViewAction,
	// 			Type:  contract.TreeNodeActionTypeAction,
	// 		},
	// 	)
	// }

	actions = append(actions, defaultActions...)
	return actions
}
