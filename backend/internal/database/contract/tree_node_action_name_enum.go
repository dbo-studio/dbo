package databaseContract

type TreeNodeActionName string

const (
	CreateDatabaseAction         TreeNodeActionName = "createDatabase"
	EditDatabaseAction           TreeNodeActionName = "editDatabase"
	CreateSchemaAction           TreeNodeActionName = "createSchema"
	EditSchemaAction             TreeNodeActionName = "editSchema"
	DropSchemaAction             TreeNodeActionName = "dropSchema"
	CreateTableAction            TreeNodeActionName = "createTable"
	CreateViewAction             TreeNodeActionName = "createView"
	CreateMaterializedViewAction TreeNodeActionName = "createMaterializedView"
	CreateIndexAction            TreeNodeActionName = "createIndex"
	CreateSequenceAction         TreeNodeActionName = "createSequence"
	DropDatabaseAction           TreeNodeActionName = "dropDatabase"
	EditTableAction              TreeNodeActionName = "editTable"
	DropTableAction              TreeNodeActionName = "dropTable"
	EditViewAction               TreeNodeActionName = "editView"
	DropViewAction               TreeNodeActionName = "dropView"
	EditMaterializedViewAction   TreeNodeActionName = "editMaterializedView"
	DropMaterializedViewAction   TreeNodeActionName = "dropMaterializedView"
	EditIndexAction              TreeNodeActionName = "editIndex"
	DropIndexAction              TreeNodeActionName = "dropIndex"
	EditSequenceAction           TreeNodeActionName = "editSequence"
	DropSequenceAction           TreeNodeActionName = "dropSequence"
	CopyNameAction               TreeNodeActionName = "copy_name"
)
