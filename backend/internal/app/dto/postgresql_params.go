package dto

type PostgresqlCreateConnectionParams struct {
	Database *string              `json:"database"`
	Host     string               `json:"host"`
	Port     int32                `json:"port"`
	Username string               `json:"username"`
	Password *string              `json:"password"`
	URI      *string              `json:"uri"`
	SSL      *ConnectionSSLParams `json:"ssl,omitempty"`
}

type PostgresqlUpdateConnectionParams struct {
	Host     *string              `json:"host"`
	Username *string              `json:"username"`
	Password *string              `json:"password"`
	Port     *int32               `json:"port"`
	Database *string              `json:"database"`
	URI      *string              `json:"uri"`
	SSL      *ConnectionSSLParams `json:"ssl,omitempty"`
}

type PostgresDatabaseParams struct {
	New *PostgresDatabaseParamsData `json:"new"`
	Old *PostgresDatabaseParamsData `json:"old"`
}

type PostgresDatabaseParamsData struct {
	Name       *string `json:"datname"`
	Owner      *string `json:"rolname"`
	Template   *string `json:"template"`
	Tablespace *string `json:"tablespace"`
	Comment    *string `json:"description"`
}

type PostgresSchemaParams struct {
	New *PostgresSchemaParamsData `json:"new"`
	Old *PostgresSchemaParamsData `json:"old"`
}

type PostgresSchemaParamsData struct {
	Name    *string `json:"nspname"`
	Owner   *string `json:"rolname"`
	Comment *string `json:"description"`
}

type PostgresTableParams struct {
	New *PostgresTableParamsData `json:"new"`
	Old *PostgresTableParamsData `json:"old"`
}

type PostgresTableParamsData struct {
	Name        *string `json:"relname"`
	Comment     *string `json:"description"`
	Persistence *string `json:"persistence"`
	Tablespace  *string `json:"tablespace"`
	Owner       *string `json:"rolname"`
}

type PostgresViewParams struct {
	New *PostgresViewParamsData `json:"new"`
	Old *PostgresViewParamsData `json:"old"`
}

type PostgresViewParamsData struct {
	Name        *string `json:"name"`
	Query       *string `json:"query"`
	Comment     *string `json:"comment"`
	CheckOption *string `json:"check_option"`
}

type PostgresMaterializedViewParams struct {
	New *PostgresMaterializedViewData `json:"new"`
	Old *PostgresMaterializedViewData `json:"old"`
}

type PostgresMaterializedViewData struct {
	Name       *string `json:"name"`
	Comment    *string `json:"comment"`
	Tablespace *string `json:"tablespace"`
	Owner      *string `json:"rolname"`
	Query      *string `json:"query"`
}

type PostgresTableColumnParams struct {
	Columns []PostgresTableColumn `json:"columns"`
}

type PostgresTableColumn struct {
	New     *PostgresTableColumnData `json:"new"`
	Old     *PostgresTableColumnData `json:"old"`
	Added   *bool                    `json:"added"`
	Deleted *bool                    `json:"deleted"`
}

type PostgresTableColumnData struct {
	Name         *string `json:"column_name"`
	DataType     *string `json:"data_type"`
	NotNull      *bool   `json:"not_null"`
	Primary      *bool   `json:"primary"`
	Default      *string `json:"column_default"`
	Comment      *string `json:"comment"`
	MaxLength    *string `json:"character_maximum_length"`
	NumericScale *string `json:"numeric_scale"`
	IsIdentity   *bool   `json:"is_identity"`
	IsGenerated  *bool   `json:"is_generated"`
}

type PostgresTableForeignKeyParams struct {
	Columns []PostgresTableForeignKey `json:"columns"`
}

type PostgresTableForeignKey struct {
	New     *PostgresTableForeignKeyData `json:"new"`
	Old     *PostgresTableForeignKeyData `json:"old"`
	Added   *bool                        `json:"added"`
	Deleted *bool                        `json:"deleted"`
}

type PostgresTableForeignKeyData struct {
	ConstraintName    *string  `json:"constraint_name"`
	Comment           *string  `json:"comment"`
	SourceColumns     []string `json:"ref_columns"`
	TargetTable       *string  `json:"target_table"`
	TargetColumns     []string `json:"target_columns"`
	OnUpdate          *string  `json:"update_action"`
	OnDelete          *string  `json:"delete_action"`
	IsDeferrable      *bool    `json:"is_deferrable"`
	InitiallyDeferred *bool    `json:"initially_deferred"`
}

type PostgresTableKeyParams struct {
	Columns []PostgresTableKey `json:"columns"`
}

type PostgresTableKey struct {
	New     *PostgresTableKeyData `json:"new"`
	Old     *PostgresTableKeyData `json:"old"`
	Added   *bool                 `json:"added"`
	Deleted *bool                 `json:"deleted"`
}

type PostgresTableKeyData struct {
	Name              *string  `json:"name"`
	Comment           *string  `json:"comment"`
	Primary           *bool    `json:"primary"`
	Columns           []string `json:"columns"`
	Deferrable        *bool    `json:"deferrable"`
	InitiallyDeferred *bool    `json:"initially_deferred"`
	ExcludeOperator   *string  `json:"exclude_operator"`
}

type PostgresTableIndexParams struct {
	Columns []PostgresTableIndex `json:"columns"`
}

type PostgresTableIndex struct {
	New     *PostgresTableIndexData `json:"new"`
	Old     *PostgresTableIndexData `json:"old"`
	Added   *bool                   `json:"added"`
	Deleted *bool                   `json:"deleted"`
}

type PostgresTableIndexData struct {
	Name    *string  `json:"name"`
	Comment *string  `json:"comment"`
	Unique  *bool    `json:"unique"`
	Method  *string  `json:"method"`
	Columns []string `json:"columns"`
	Where   *string  `json:"where"`
}

type PostgresTypeParams struct {
	New *PostgresTypeData `json:"new"`
	Old *PostgresTypeData `json:"old"`
}

// PostgresTypeData describes an enum type; Values is the ordered, comma
// separated label list.
type PostgresTypeData struct {
	Name    *string `json:"name"`
	Comment *string `json:"comment"`
	Values  *string `json:"values"`
}

type PostgresTableCheckParams struct {
	Columns []PostgresTableCheck `json:"columns"`
}

type PostgresTableCheck struct {
	New     *PostgresTableCheckData `json:"new"`
	Old     *PostgresTableCheckData `json:"old"`
	Added   *bool                   `json:"added"`
	Deleted *bool                   `json:"deleted"`
}

type PostgresTableCheckData struct {
	Name       *string `json:"name"`
	Expression *string `json:"expression"`
	Comment    *string `json:"comment"`
}

type PostgresTableTriggerParams struct {
	Columns []PostgresTableTrigger `json:"columns"`
}

type PostgresTableTrigger struct {
	New     *PostgresTableTriggerData `json:"new"`
	Old     *PostgresTableTriggerData `json:"old"`
	Added   *bool                     `json:"added"`
	Deleted *bool                     `json:"deleted"`
}

// PostgresTableTriggerData.Function is "schema.function"; the function must
// already exist and return trigger.
type PostgresTableTriggerData struct {
	Name        *string  `json:"name"`
	Comment     *string  `json:"comment"`
	Timing      *string  `json:"timing"`
	Events      []string `json:"events"`
	Orientation *string  `json:"orientation"`
	When        *string  `json:"when"`
	Function    *string  `json:"function"`
}

type PostgresSequenceParams struct {
	New *PostgresSequenceData `json:"new"`
	Old *PostgresSequenceData `json:"old"`
}

type PostgresTableSequenceParams struct {
	Columns []PostgresTableSequence `json:"columns"`
}

type PostgresTableSequence struct {
	New     *PostgresSequenceData `json:"new"`
	Old     *PostgresSequenceData `json:"old"`
	Added   *bool                 `json:"added"`
	Deleted *bool                 `json:"deleted"`
}

// PostgresSequenceData serves the standalone form and the table tab. OwnedBy
// is "table.column" in the standalone form and a bare column of the edited
// table in the table tab.
type PostgresSequenceData struct {
	Name      *string `json:"name"`
	Comment   *string `json:"comment"`
	Start     *string `json:"start_value"`
	Increment *string `json:"increment_by"`
	MinValue  *string `json:"min_value"`
	MaxValue  *string `json:"max_value"`
	Cache     *string `json:"cache_size"`
	Cycle     *bool   `json:"cycle"`
	OwnedBy   *string `json:"owned_by"`
}
