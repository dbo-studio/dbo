package databaseContract

type TreeTab string

const (
	DatabaseTab TreeTab = "database"

	SchemaTab TreeTab = "schema"

	ViewTab TreeTab = "view"

	MaterializedViewTab TreeTab = "materialized_view"

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
