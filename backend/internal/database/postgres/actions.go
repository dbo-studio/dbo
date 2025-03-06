package databasePostgres

import (
	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *PostgresRepository) Actions(nodeType string) []contract.TreeNodeAction {
	actions := make([]contract.TreeNodeAction, 0)

	switch nodeType {
	case "root":
		actions = append(actions, contract.TreeNodeAction{
			Name: "create_database",
			Type: contract.TreeNodeActionTypeForm,
		})
	case "database":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "create_schema",
				Type: contract.TreeNodeActionTypeForm,
			}, contract.TreeNodeAction{
				Name: "create_table",
				Type: contract.TreeNodeActionTypeForm,
			},
			contract.TreeNodeAction{
				Name: "create_view",
				Type: contract.TreeNodeActionTypeForm,
			},
			contract.TreeNodeAction{
				Name: "drop_database",
				Type: contract.TreeNodeActionTypeAction,
			},
		)
	case "schema":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "create_table",
				Type: contract.TreeNodeActionTypeForm,
			}, contract.TreeNodeAction{
				Name: "create_view",
				Type: contract.TreeNodeActionTypeForm,
			},
			contract.TreeNodeAction{
				Name: "create_materialized_view",
				Type: contract.TreeNodeActionTypeForm,
			},
			contract.TreeNodeAction{
				Name: "create_index",
				Type: contract.TreeNodeActionTypeForm,
			},
			contract.TreeNodeAction{
				Name: "create_sequence",
				Type: contract.TreeNodeActionTypeForm,
			},
			contract.TreeNodeAction{
				Name: "drop_database",
				Type: contract.TreeNodeActionTypeAction,
			},
		)
	case "table_container":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "create_table",
				Type: contract.TreeNodeActionTypeForm,
			})
	case "view_container":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "create_view",
				Type: contract.TreeNodeActionTypeForm,
			})
	case "materialized_view_container":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "create_materialized_view",
				Type: contract.TreeNodeActionTypeForm,
			})
	case "index_container":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "create_index",
				Type: contract.TreeNodeActionTypeForm,
			})
	case "sequence_container":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "create_sequence",
				Type: contract.TreeNodeActionTypeForm,
			})
	case "table":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "edit_table",
				Type: contract.TreeNodeActionTypeForm,
			}, contract.TreeNodeAction{
				Name: "drop_table",
				Type: contract.TreeNodeActionTypeAction,
			},
			contract.TreeNodeAction{
				Name: "copy_name",
				Type: contract.TreeNodeActionTypeCommand,
			},
		)
	case "view":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "edit_view",
				Type: contract.TreeNodeActionTypeForm,
			}, contract.TreeNodeAction{
				Name: "drop_view",
				Type: contract.TreeNodeActionTypeAction,
			},
		)
	case "materialized_view":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "edit_materialized_view",
				Type: contract.TreeNodeActionTypeForm,
			}, contract.TreeNodeAction{
				Name: "drop_materialized_view",
				Type: contract.TreeNodeActionTypeAction,
			},
		)
	case "index":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "edit_index",
				Type: contract.TreeNodeActionTypeForm,
			}, contract.TreeNodeAction{
				Name: "drop_index",
				Type: contract.TreeNodeActionTypeAction,
			},
		)
	case "sequence":
		actions = append(actions,
			contract.TreeNodeAction{
				Name: "edit_sequence",
				Type: contract.TreeNodeActionTypeForm,
			}, contract.TreeNodeAction{
				Name: "drop_sequence",
				Type: contract.TreeNodeActionTypeAction,
			},
		)
	}

	return actions
}
