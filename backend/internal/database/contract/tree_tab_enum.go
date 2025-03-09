package databaseContract

type TreeTab string

const (
	GeneralTab     TreeTab = "general"
	PrivilegesTab  TreeTab = "privileges"
	TableTab       TreeTab = "table"
	ColumnsTab     TreeTab = "columns"
	ForeignKeysTab TreeTab = "foreign_keys"
	IndexesTab     TreeTab = "indexes"
	TriggersTab    TreeTab = "triggers"
	ChecksTab      TreeTab = "checks"
	DefinitionTab  TreeTab = "definition"
	StorageTab     TreeTab = "storage"
)
