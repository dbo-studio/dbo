package dto

type MysqlCreateConnectionParams struct {
	Database *string `json:"database"`
	Host     string  `json:"host"`
	Port     int32   `json:"port"`
	Username string  `json:"username"`
	Password *string `json:"password"`
	URI      *string `json:"uri"`
}

type MysqlUpdateConnectionParams struct {
	Host     *string `json:"host"`
	Username *string `json:"username"`
	Password *string `json:"password"`
	Port     *int32  `json:"port"`
	Database *string `json:"database"`
	URI      *string `json:"uri"`
}

type MysqlDatabaseParams struct {
	New *MysqlDatabaseParamsData `json:"new"`
	Old *MysqlDatabaseParamsData `json:"old"`
}

type MysqlDatabaseParamsData struct {
	Name       *string `json:"datname"`
	Owner      *string `json:"rolname"`
	Template   *string `json:"template"`
	Tablespace *string `json:"tablespace"`
	Comment    *string `json:"description"`
}

type MysqlSchemaParams struct {
	New *MysqlSchemaParamsData `json:"new"`
	Old *MysqlSchemaParamsData `json:"old"`
}

type MysqlSchemaParamsData struct {
	Name    *string `json:"nspname"`
	Owner   *string `json:"rolname"`
	Comment *string `json:"description"`
}

type MysqlTableParams struct {
	New *MysqlTableParamsData `json:"new"`
	Old *MysqlTableParamsData `json:"old"`
}

type MysqlTableParamsData struct {
	Name        *string `json:"relname"`
	Comment     *string `json:"description"`
	Persistence *string `json:"persistence"`
	Tablespace  *string `json:"tablespace"`
	Owner       *string `json:"rolname"`
}

type MysqlViewParams struct {
	New *MysqlViewParamsData `json:"new"`
	Old *MysqlViewParamsData `json:"old"`
}

type MysqlViewParamsData struct {
	Name        *string `json:"name"`
	Query       *string `json:"query"`
	Comment     *string `json:"comment"`
	CheckOption *string `json:"check_option"`
}

type MysqlMaterializedViewParams struct {
	New *MysqlMaterializedViewData `json:"new"`
	Old *MysqlMaterializedViewData `json:"old"`
}

type MysqlMaterializedViewData struct {
	Name       *string `json:"name"`
	Comment    *string `json:"comment"`
	Tablespace *string `json:"tablespace"`
	Owner      *string `json:"rolname"`
	Query      *string `json:"query"`
}

type MysqlIndexParams struct {
	Name           *string `json:"name"`
	Comment        *string `json:"comment"`
	Unique         *bool   `json:"unique"`
	Columns        *string `json:"columns"`
	Condition      *string `json:"condition"`
	IncludeColumns *string `json:"include_columns"`
	AccessMethod   *string `json:"access_method"`
	Tablespace     *string `json:"tablespace"`
}

type MysqlSequenceParams struct {
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

type MysqlTableColumnParams struct {
	Columns []MysqlTableColumn `json:"columns"`
}

type MysqlTableColumn struct {
	New     *MysqlTableColumnData `json:"new"`
	Old     *MysqlTableColumnData `json:"old"`
	Added   *bool                 `json:"added"`
	Deleted *bool                 `json:"deleted"`
}

type MysqlTableColumnData struct {
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

type MysqlTableForeignKeyParams struct {
	Columns []MysqlTableForeignKey `json:"columns"`
}

type MysqlTableForeignKey struct {
	New     *MysqlTableForeignKeyData `json:"new"`
	Old     *MysqlTableForeignKeyData `json:"old"`
	Added   *bool                     `json:"added"`
	Deleted *bool                     `json:"deleted"`
}

type MysqlTableForeignKeyData struct {
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
