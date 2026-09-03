package databaseCore

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

// ResolveExecuteIdentity computes the post-execute tree identity for the object form tab.
// Returns an empty result when the tab should not remount (edit-in-place, drop).
func ResolveExecuteIdentity(
	connectionType string,
	nodeID string,
	action databaseContract.TreeNodeActionName,
	params []byte,
) *databaseContract.ExecuteResult {
	oldName, newName := objectNames(action, params)
	if newName == "" {
		return &databaseContract.ExecuteResult{}
	}

	isCreate := databaseContract.NextActionAfterCreate(action) != ""
	if !isCreate && (oldName == "" || oldName == newName) {
		return &databaseContract.ExecuteResult{}
	}

	node := parseNodeID(connectionType, nodeID)

	switch action {
	case databaseContract.CreateDatabaseAction, databaseContract.EditDatabaseAction:
		return newExecuteResult(newName, action)
	case databaseContract.CreateSchemaAction, databaseContract.EditSchemaAction:
		node.Schema = newName
	case databaseContract.CreateTableAction, databaseContract.EditTableAction,
		databaseContract.CreateViewAction, databaseContract.EditViewAction,
		databaseContract.CreateMaterializedViewAction, databaseContract.EditMaterializedViewAction:
		node.Table = newName
	default:
		return &databaseContract.ExecuteResult{}
	}

	return newExecuteResult(FormatNodeID(connectionType, node), action)
}

func newExecuteResult(nodeID string, action databaseContract.TreeNodeActionName) *databaseContract.ExecuteResult {
	if nodeID == "" {
		return &databaseContract.ExecuteResult{}
	}

	return &databaseContract.ExecuteResult{
		NodeID:     nodeID,
		NextAction: databaseContract.NextActionAfterCreate(action),
	}
}

func parseNodeID(connectionType, nodeID string) databaseContract.DBNode {
	switch connectionType {
	case string(databaseContract.Mysql):
		return (&BaseRepository{}).mysqlNode(nodeID)
	case string(databaseContract.Postgresql):
		return (&BaseRepository{}).postgresqlNode(nodeID)
	case string(databaseContract.Sqlite):
		return (&BaseRepository{}).sqliteNode(nodeID)
	default:
		return databaseContract.DBNode{}
	}
}

func objectNames(action databaseContract.TreeNodeActionName, params []byte) (oldName, newName string) {
	switch action {
	case databaseContract.CreateDatabaseAction, databaseContract.EditDatabaseAction:
		db := decodeTab[dto.PostgresDatabaseParams](params, databaseContract.DatabaseTab, databaseContract.GeneralTab)
		if db == nil {
			return "", ""
		}

		return ptrName(db.Old), ptrName(db.New)

	case databaseContract.CreateSchemaAction, databaseContract.EditSchemaAction:
		s := decodeTab[dto.PostgresSchemaParams](params, databaseContract.SchemaTab, databaseContract.GeneralTab)
		if s == nil {
			return "", ""
		}

		return ptrName(s.Old), ptrName(s.New)

	case databaseContract.CreateTableAction, databaseContract.EditTableAction:
		if t := decodeTab[dto.PostgresTableParams](params, databaseContract.GeneralTab); t != nil {
			oldName, newName = ptrName(t.Old), ptrName(t.New)
		}

		if oldName == "" && newName == "" {
			if t := decodeTab[dto.SQLiteTableParams](params, databaseContract.GeneralTab); t != nil {
				return ptrName(t.Old), ptrName(t.New)
			}
		}

		return oldName, newName

	case databaseContract.CreateViewAction, databaseContract.EditViewAction:
		v := decodeTab[dto.PostgresViewParams](params, databaseContract.ViewTab, databaseContract.GeneralTab)
		if v == nil {
			return "", ""
		}

		return ptrName(v.Old), ptrName(v.New)

	case databaseContract.CreateMaterializedViewAction, databaseContract.EditMaterializedViewAction:
		m := decodeTab[dto.PostgresMaterializedViewParams](params, databaseContract.MaterializedViewTab, databaseContract.GeneralTab)
		if m == nil {
			return "", ""
		}

		return ptrName(m.Old), ptrName(m.New)

	default:
		return "", ""
	}
}

func decodeTab[T any](params []byte, tabs ...databaseContract.TreeTab) *T {
	parsed, err := helper.ConvertToDTO[map[databaseContract.TreeTab]*T](params)
	if err != nil {
		return nil
	}

	for _, tab := range tabs {
		if parsed[tab] != nil {
			return parsed[tab]
		}
	}

	return nil
}

// ptrName extracts .Name from the common Old/New param data shapes used by object forms.
func ptrName(data any) string {
	switch v := data.(type) {
	case *dto.PostgresDatabaseParamsData:
		if v != nil && v.Name != nil {
			return *v.Name
		}
	case *dto.PostgresSchemaParamsData:
		if v != nil && v.Name != nil {
			return *v.Name
		}
	case *dto.PostgresTableParamsData:
		if v != nil && v.Name != nil {
			return *v.Name
		}
	case *dto.SQLiteTableParamsData:
		if v != nil && v.Name != nil {
			return *v.Name
		}
	case *dto.PostgresViewParamsData:
		if v != nil && v.Name != nil {
			return *v.Name
		}
	case *dto.PostgresMaterializedViewData:
		if v != nil && v.Name != nil {
			return *v.Name
		}
	}

	return ""
}
