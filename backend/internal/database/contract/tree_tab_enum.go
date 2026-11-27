package databaseContract

type TreeTab string

const (
	GeneralTab TreeTab = "general"

	DatabaseTab TreeTab = "database"

	CollectionTab           TreeTab = "collection"
	CollectionIndexesTab    TreeTab = "collection_indexes"
	CollectionValidationTab TreeTab = "collection_validation"
	UserTab                 TreeTab = "user"

	SchemaTab TreeTab = "schema"

	ViewTab TreeTab = "view"

	MaterializedViewTab TreeTab = "materialized_view"

	TypeTab TreeTab = "type"

	SequenceTab TreeTab = "sequence"

	EventTab TreeTab = "event"

	FunctionTab  TreeTab = "function"
	ProcedureTab TreeTab = "procedure"

	TableTab            TreeTab = "table"
	TableColumnsTab     TreeTab = "table_columns"
	TableForeignKeysTab TreeTab = "table_foreign_keys"
	TableIndexesTab     TreeTab = "table_indexes"
	TableTriggersTab    TreeTab = "table_triggers"
	TableChecksTab      TreeTab = "table_checks"
	TableStorageTab     TreeTab = "table_storage"

	TableSequenceTab TreeTab = "table_sequence"
	TableKeysTab     TreeTab = "table_keys"
)
