package databasePostgres

import (
	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *PostgresRepository) Actions(nodeType contract.TreeNodeType) []contract.TreeNodeAction {
	actions := make([]contract.TreeNodeAction, 0)

	switch nodeType {
	case contract.RootNodeType:
	case contract.DatabaseContainerNodeType:
		actions = append(actions, contract.TreeNodeAction{
			Title: "Create database",
			Name:  contract.CreateDatabaseAction,
			Type:  contract.TreeNodeActionTypeTab,
			Params: map[string]any{
				"path": "object",
			},
		})
	case contract.DatabaseNodeType:
		actions = append(actions,
			contract.TreeNodeAction{
				Title: "Edit database",
				Name:  contract.EditDatabaseAction,
				Type:  contract.TreeNodeActionTypeTab,
				Params: map[string]any{
					"path": "object-detail",
				},
			},
			contract.TreeNodeAction{
				Title: "Drop database",
				Name:  contract.DropDatabaseAction,
				Type:  contract.TreeNodeActionTypeAction,
			},
			contract.TreeNodeAction{
				Title: "Create schema",
				Name:  contract.CreateSchemaAction,
				Type:  contract.TreeNodeActionTypeTab,
				Params: map[string]any{
					"path": "object",
				},
			},
		)
	case contract.SchemaNodeType:
		actions = append(actions,
			contract.TreeNodeAction{
				Title: "Edit schema",
				Name:  contract.EditSchemaAction,
				Type:  contract.TreeNodeActionTypeTab,
				Params: map[string]any{
					"path": "object-detail",
				},
			},
			contract.TreeNodeAction{
				Title: "Drop schema",
				Name:  contract.DropSchemaAction,
				Type:  contract.TreeNodeActionTypeAction,
			},
		)
	case contract.TableContainerNodeType:
		actions = append(actions,
			contract.TreeNodeAction{
				Title: "Create table",
				Name:  contract.CreateTableAction,
				Type:  contract.TreeNodeActionTypeTab,
				Params: map[string]any{
					"path": "object",
				},
			})
	case contract.ViewContainerNodeType:
		actions = append(actions,
			contract.TreeNodeAction{
				Title: "Create view",
				Name:  contract.CreateViewAction,
				Type:  contract.TreeNodeActionTypeTab,
				Params: map[string]any{
					"path": "object",
				},
			})
	case contract.MaterializedViewContainerNodeType:
		actions = append(actions,
			contract.TreeNodeAction{
				Title: "Create materialized view",
				Name:  contract.CreateMaterializedViewAction,
				Type:  contract.TreeNodeActionTypeTab,
				Params: map[string]any{
					"path": "object",
				},
			})
	case contract.IndexContainerNodeType:
		actions = append(actions,
			contract.TreeNodeAction{
				Title: "Create index",
				Name:  contract.CreateIndexAction,
				Type:  contract.TreeNodeActionTypeTab,
				Params: map[string]any{
					"path": "object",
				},
			})
	case contract.SequenceContainerNodeType:
		actions = append(actions,
			contract.TreeNodeAction{
				Title: "Create sequence",
				Name:  contract.CreateSequenceAction,
				Type:  contract.TreeNodeActionTypeTab,
				Params: map[string]any{
					"path": "object",
				},
			})
	case contract.TableNodeType:
		actions = append(actions,
			contract.TreeNodeAction{
				Title: "Edit table",
				Name:  contract.EditTableAction,
				Type:  contract.TreeNodeActionTypeTab,
				Params: map[string]any{
					"path": "object-detail",
				},
			},
			contract.TreeNodeAction{
				Title: "Drop table",
				Name:  contract.DropTableAction,
				Type:  contract.TreeNodeActionTypeAction,
			},
			contract.TreeNodeAction{
				Title: "Copy name",
				Name:  contract.CopyNameAction,
				Type:  contract.TreeNodeActionTypeCommand,
			},
		)
	case contract.ViewNodeType:
		actions = append(actions,
			contract.TreeNodeAction{
				Title: "Edit view",
				Name:  contract.EditViewAction,
				Type:  contract.TreeNodeActionTypeTab,
				Params: map[string]any{
					"path": "object-detail",
				},
			},
			contract.TreeNodeAction{
				Title: "Drop view",
				Name:  contract.DropViewAction,
				Type:  contract.TreeNodeActionTypeAction,
			},
		)
	case contract.MaterializedViewNodeType:
		actions = append(actions,
			contract.TreeNodeAction{
				Title: "Edit materialized view",
				Name:  contract.EditMaterializedViewAction,
				Type:  contract.TreeNodeActionTypeTab,
				Params: map[string]any{
					"path": "object-detail",
				},
			},
			contract.TreeNodeAction{
				Title: "Drop materialized view",
				Name:  contract.DropMaterializedViewAction,
				Type:  contract.TreeNodeActionTypeAction,
			},
		)
	case contract.IndexNodeType:
		actions = append(actions,
			contract.TreeNodeAction{
				Title: "Edit index",
				Name:  contract.EditIndexAction,
				Type:  contract.TreeNodeActionTypeTab,
				Params: map[string]any{
					"path": "object-detail",
				},
			},
			contract.TreeNodeAction{
				Title: "Drop index",
				Name:  contract.DropIndexAction,
				Type:  contract.TreeNodeActionTypeAction,
			},
		)
	case contract.SequenceNodeType:
		actions = append(actions,
			contract.TreeNodeAction{
				Title: "Edit sequence",
				Name:  contract.EditSequenceAction,
				Type:  contract.TreeNodeActionTypeTab,
				Params: map[string]any{
					"path": "object-detail",
				},
			},
			contract.TreeNodeAction{
				Title: "Drop sequence",
				Name:  contract.DropSequenceAction,
				Type:  contract.TreeNodeActionTypeAction,
			},
		)
	}

	return actions
}
