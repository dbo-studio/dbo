package databaseContract

type TreeNodeActionName string

const (
	CreateDatabaseAction                TreeNodeActionName = "createDatabase"
	EditDatabaseAction                  TreeNodeActionName = "editDatabase"
	CreateSchemaAction                  TreeNodeActionName = "createSchema"
	EditSchemaAction                    TreeNodeActionName = "editSchema"
	DropSchemaAction                    TreeNodeActionName = "dropSchema"
	CreateTableAction                   TreeNodeActionName = "createTable"
	CreateViewAction                    TreeNodeActionName = "createView"
	CreateMaterializedViewAction        TreeNodeActionName = "createMaterializedView"
	RefreshMaterializedViewAction       TreeNodeActionName = "refreshMaterializedView"
	RefreshMaterializedViewNoDataAction TreeNodeActionName = "refreshMaterializedViewNoData"
	CreateFunctionAction                TreeNodeActionName = "createFunction"
	EditFunctionAction                  TreeNodeActionName = "editFunction"
	DropFunctionAction                  TreeNodeActionName = "dropFunction"
	CreateProcedureAction               TreeNodeActionName = "createProcedure"
	EditProcedureAction                 TreeNodeActionName = "editProcedure"
	DropProcedureAction                 TreeNodeActionName = "dropProcedure"
	CreateEventAction                   TreeNodeActionName = "createEvent"
	EditEventAction                     TreeNodeActionName = "editEvent"
	DropEventAction                     TreeNodeActionName = "dropEvent"
	CreateTypeAction                    TreeNodeActionName = "createType"
	EditTypeAction                      TreeNodeActionName = "editType"
	DropTypeAction                      TreeNodeActionName = "dropType"
	CreateIndexAction                   TreeNodeActionName = "createIndex"
	// ExecuteSQLAction runs the one statement in the params, for data changes a changeset applies.
	ExecuteSQLAction     TreeNodeActionName = "executeSql"
	CreateSequenceAction TreeNodeActionName = "createSequence"
	DropDatabaseAction   TreeNodeActionName = "dropDatabase"
	EditTableAction      TreeNodeActionName = "editTable"
	DropTableAction      TreeNodeActionName = "dropTable"
	EditViewAction       TreeNodeActionName = "editView"
	DropViewAction       TreeNodeActionName = "dropView"
	// RenameAction renames a table or view; params are {"name": "<new name>"}.
	RenameAction               TreeNodeActionName = "rename"
	EditMaterializedViewAction TreeNodeActionName = "editMaterializedView"
	DropMaterializedViewAction TreeNodeActionName = "dropMaterializedView"
	EditIndexAction            TreeNodeActionName = "editIndex"
	DropIndexAction            TreeNodeActionName = "dropIndex"
	EditSequenceAction         TreeNodeActionName = "editSequence"
	DropSequenceAction         TreeNodeActionName = "dropSequence"
	CopyNameAction             TreeNodeActionName = "copyName"
	RefreshAction              TreeNodeActionName = "refresh"
	BrowseContainerAction      TreeNodeActionName = "browseContainer"
	OpenToolAction             TreeNodeActionName = "openTool"
)

func NextActionAfterCreate(action TreeNodeActionName) TreeNodeActionName {
	switch action {
	case CreateDatabaseAction:
		return EditDatabaseAction
	case CreateSchemaAction:
		return EditSchemaAction
	case CreateTableAction:
		return EditTableAction
	case CreateViewAction:
		return EditViewAction
	case CreateMaterializedViewAction:
		return EditMaterializedViewAction
	case CreateFunctionAction:
		return EditFunctionAction
	case CreateProcedureAction:
		return EditProcedureAction
	case CreateEventAction:
		return EditEventAction
	case CreateSequenceAction:
		return EditSequenceAction
	case CreateTypeAction:
		return EditTypeAction
	default:
		return ""
	}
}
