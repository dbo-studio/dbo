package databaseContract

type TreeTab string

const (
	DatabaseTab           TreeTab = "database"
	DatabasePrivilegesTab TreeTab = "databaseـprivileges"

	SchemaTab           TreeTab = "schema"
	SchemaPrivilegesTab TreeTab = "schema_privileges"

	ViewTab           TreeTab = "view"
	ViewDefinitionTab TreeTab = "view_definition"
	ViewPrivilegesTab TreeTab = "view_privileges"

	MaterializedViewTab           TreeTab = "materialized_view"
	MaterializedViewDefinitionTab TreeTab = "materialized_view_definition"
	MaterializedViewPrivilegesTab TreeTab = "materialized_view_privileges"
	MaterializedViewStorageTab    TreeTab = "materialized_view_storage"

	IndexTab           TreeTab = "index"
	IndexPrivilegesTab TreeTab = "index_privileges"
	IndexColumnsTab    TreeTab = "index_columns"
	IndexStorageTab    TreeTab = "index_storage"

	SequenceTab           TreeTab = "sequence"
	SequenceDefinitionTab TreeTab = "sequence_definition"
	SequencePrivilegesTab TreeTab = "sequence_privileges"

	TableTab            TreeTab = "table"
	TableColumnsTab     TreeTab = "table_columns"
	TableForeignKeysTab TreeTab = "table_foreign_keys"
	TableIndexesTab     TreeTab = "table_indexes"
	TableTriggersTab    TreeTab = "table_triggers"
	TableChecksTab      TreeTab = "table_checks"
	TableStorageTab     TreeTab = "table_storage"
	TableKeysTab        TreeTab = "table_keys"
)
