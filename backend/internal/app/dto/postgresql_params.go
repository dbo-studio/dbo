package dto

type PostgresqlCreateConnectionParams struct {
	Database *string `json:"database"`
	Host     string  `json:"host"`
	Port     int32   `json:"port"`
	Username string  `json:"username"`
	Password *string `json:"password"`
}

type PostgresqlUpdateConnectionParams struct {
	Host     *string `json:"host"`
	Username *string `json:"username"`
	Password *string `json:"password"`
	Port     *int32  `json:"port"`
	Database *string `json:"database"`
}

type PostgresDatabaseParams struct {
	Name       *string `json:"datname"`
	Owner      *string `json:"rolname"`
	Template   *string `json:"template"`
	Tablespace *string `json:"tablespace"`
	Comment    *string `json:"description"`
}

type PostgresSchemaParams struct {
	Name    *string `json:"nspname"`
	Owner   *string `json:"rolname"`
	Comment *string `json:"description"`
}

type PostgresTableParams struct {
	Name        *string `json:"relname"`
	Comment     *string `json:"description"`
	Persistence *string `json:"persistence"`
	Tablespace  *string `json:"tablespace"`
	Owner       *string `json:"rolname"`
}

type PostgresViewParams struct {
	Name        *string `json:"name"`
	Query       *string `json:"query"`
	Comment     *string `json:"description"`
	CheckOption *string `json:"check_option"`
}

type PostgresMaterializedViewParams struct {
	Name        *string `json:"name"`
	Query       *string `json:"query"`
	Comment     *string `json:"description"`
	CheckOption *string `json:"check_option"`
}

type PostgresIndexParams struct {
	Name           *string `json:"name"`
	Comment        *string `json:"comment"`
	Unique         *bool   `json:"unique"`
	Columns        *string `json:"columns"`
	Condition      *string `json:"condition"`
	IncludeColumns *string `json:"include_columns"`
	AccessMethod   *string `json:"access_method"`
	Tablespace     *string `json:"tablespace"`
}

type PostgresSequenceParams struct {
	Name       *string `json:"name"`
	Comment    *string `json:"comment"`
	Increment  *int64  `json:"increment"`
	MinValue   *int64  `json:"min_value"`
	MaxValue   *int64  `json:"max_value"`
	StartValue *int64  `json:"start_value"`
	Cache      *int64  `json:"cache"`
	Cycle      *bool   `json:"cycle"`
	OwnedBy    *string `json:"owned_by"`
}

type ColumnDefinition struct {
	Name     string `json:"name"`
	DataType string `json:"dataType"`
	NotNull  bool   `json:"notNull,omitempty"`
	Primary  bool   `json:"primary,omitempty"`
	Default  string `json:"default,omitempty"`
}

type PostgresTableColumnParams struct {
	Columns []PostgresTableColumn `json:"columns"`
}

type PostgresTableColumn struct {
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
	Deleted      *bool   `json:"deleted"`
	Added        *bool   `json:"added"`
}

type PostgresTableForeignKeyParams struct {
	Columns []PostgresTableForeignKey `json:"columns"`
}

type PostgresTableForeignKey struct {
	ConstraintName    *string  `json:"constraint_name"`
	Comment           *string  `json:"comment"`
	SourceColumns     []string `json:"ref_columns"`
	TargetTable       *string  `json:"ref_table"`
	TargetColumns     []string `json:"target_columns"`
	OnUpdate          *string  `json:"update_action"`
	OnDelete          *string  `json:"delete_action"`
	IsDeferrable      *bool    `json:"is_deferrable"`
	InitiallyDeferred *bool    `json:"initially_deferred"`
	Deleted           *bool    `json:"deleted"`
	Added             *bool    `json:"added"`
}
