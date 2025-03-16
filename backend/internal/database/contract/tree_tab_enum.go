package databaseContract

type TreeTab string

const (
	DatabaseTab           TreeTab = "database"
	DatabasePrivilegesTab TreeTab = "database_privileges"

	SchemaTab           TreeTab = "schema"
	SchemaPrivilegesTab TreeTab = "schema_privileges"

	ViewTab           TreeTab = "view"
	ViewPrivilegesTab TreeTab = "view_privileges"

	MaterializedViewTab           TreeTab = "materialized_view"
	MaterializedViewPrivilegesTab TreeTab = "materialized_view_privileges"

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
