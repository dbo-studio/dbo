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
	Name       *string `json:"datname,omitempty"`
	Owner      *string `json:"rolname,omitempty"`
	Template   *string `json:"template,omitempty"`
	Tablespace *string `json:"tablespace,omitempty"`
	Comment    *string `json:"description,omitempty"`
}

type PostgresDatabasePrivilegeParams struct {
	Grantee    string   `json:"grantee,omitempty"`
	Grantor    string   `json:"grantor,omitempty"`
	Privileges []string `json:"privileges,omitempty"`
}

type PostgresSchemaParams struct {
	Name    *string `json:"nspname,omitempty"`
	Owner   *string `json:"rolname,omitempty"`
	Comment *string `json:"description,omitempty"`
}

type PostgresTableParams struct {
	Name        *string `json:"relname"`
	Comment     *string `json:"description,omitempty"`
	Persistence *string `json:"persistence,omitempty"`
	Tablespace  *string `json:"tablespace,omitempty"`
	Owner       *string `json:"rolname,omitempty"`
}

type PostgresViewParams struct {
	Name        string `json:"name,omitempty"`
	Query       string `json:"query,omitempty"`
	Comment     string `json:"description,omitempty"`
	CheckOption string `json:"check_option,omitempty"`
}

type PostgresMaterializedViewParams struct {
	Name        string `json:"name,omitempty"`
	Query       string `json:"query,omitempty"`
	Comment     string `json:"description,omitempty"`
	CheckOption string `json:"check_option,omitempty"`
}

type PostgresIndexParams struct {
	Name           string `json:"name,omitempty"`
	Comment        string `json:"comment,omitempty"`
	Unique         bool   `json:"unique,omitempty"`
	Columns        string `json:"columns,omitempty"`
	Condition      string `json:"condition,omitempty"`
	IncludeColumns string `json:"include_columns,omitempty"`
	AccessMethod   string `json:"access_method,omitempty"`
	Tablespace     string `json:"tablespace,omitempty"`
}

type PostgresSequenceParams struct {
	Name       string `json:"name"`
	Comment    string `json:"comment"`
	Increment  int64  `json:"increment"`
	MinValue   int64  `json:"min_value"`
	MaxValue   int64  `json:"max_value"`
	StartValue int64  `json:"start_value"`
	Cache      int64  `json:"cache"`
	Cycle      bool   `json:"cycle"`
	OwnedBy    string `json:"owned_by"`
}

type ColumnDefinition struct {
	Name     string `json:"name"`
	DataType string `json:"dataType"`
	NotNull  bool   `json:"notNull,omitempty"`
	Primary  bool   `json:"primary,omitempty"`
	Default  string `json:"default,omitempty"`
}

type PostgresTableColumnParams struct {
	Columns []struct {
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
	} `json:"columns"`
}

type PostgresTableForeignKeyParams struct {
	Columns []struct {
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
	} `json:"columns"`
}
