package dto

type SQLiteCreateConnectionParams struct {
	Path string `json:"path"`
}

type SQLiteUpdateConnectionParams struct {
	Path *string `json:"path"`
}

type SQLiteTableParams struct {
	New *SQLiteTableParamsData `json:"new"`
	Old *SQLiteTableParamsData `json:"old"`
}

type SQLiteTableParamsData struct {
	Name         *string `json:"name"`
	Temporary    *bool   `json:"temporary"`
	Strict       *bool   `json:"strict"`
	WithoutRowid *bool   `json:"without_rowid"`
}

type SQLiteTableColumnParams struct {
	Columns []SQLiteTableColumn `json:"columns"`
}

type SQLiteTableColumn struct {
	New     *SQLiteTableColumnData `json:"new"`
	Old     *SQLiteTableColumnData `json:"old"`
	Added   *bool                  `json:"added"`
	Deleted *bool                  `json:"deleted"`
}

type SQLiteTableColumnData struct {
	Name            *string `json:"name"`
	DataType        *string `json:"type"`
	NotNull         *bool   `json:"not_null"`
	ColumnKind      *string `json:"column_kind"`
	Default         *string `json:"dflt_value"`
	OnNullConflicts *string `json:"on_null_conflicts"`
	CollectionName  *string `json:"collection_name"`
}

type SQLiteTableForeignKeyParams struct {
	Columns []SQLiteTableForeignKey `json:"columns"`
}

type SQLiteTableForeignKey struct {
	New     *SQLiteTableForeignKeyData `json:"new"`
	Old     *SQLiteTableForeignKeyData `json:"old"`
	Added   *bool                      `json:"added"`
	Deleted *bool                      `json:"deleted"`
}

type SQLiteTableForeignKeyData struct {
	ConstraintName    *string  `json:"name"`
	SourceColumns     []string `json:"ref_columns"`
	TargetTable       *string  `json:"target_table"`
	TargetColumns     []string `json:"target_columns"`
	OnUpdate          *string  `json:"update_action"`
	OnDelete          *string  `json:"delete_action"`
	IsDeferrable      *bool    `json:"is_deferrable"`
	InitiallyDeferred *bool    `json:"initially_deferred"`
}

type SQLiteTableKeyParams struct {
	Keys []SQLiteTableKey `json:"columns"`
}

type SQLiteTableKey struct {
	New     *SQLiteTableKeyData `json:"new"`
	Old     *SQLiteTableKeyData `json:"old"`
	Added   *bool               `json:"added"`
	Deleted *bool               `json:"deleted"`
}

type SQLiteTableKeyData struct {
	Name    *string  `json:"name"`
	Columns []string `json:"columns"`
	Type    *string  `json:"type"`
}

type SQLiteIndexParams struct {
	Indexes []SQLiteIndex `json:"columns"`
}

type SQLiteIndex struct {
	New     *SQLiteIndexData `json:"new"`
	Old     *SQLiteIndexData `json:"old"`
	Added   *bool            `json:"added"`
	Deleted *bool            `json:"deleted"`
}

type SQLiteIndexData struct {
	Name    *string  `json:"name"`
	Columns []string `json:"columns"`
	Unique  *bool    `json:"unique"`
	Order   *string  `json:"order"`
}
