package dto

type SQLiteCreateConnectionParams struct {
	Path string `json:"path"`
}

type SQLiteUpdateConnectionParams struct {
	Path *string `json:"path"`
}

type SQLiteCreateTableParams struct {
	Name    string             `json:"name"`
	Columns []ColumnDefinition `json:"columns"`
}

type SQLiteUpdateTableParams struct {
	OldName    string             `json:"oldName"`
	NewName    string             `json:"newName"`
	AddColumns []ColumnDefinition `json:"addColumns"`
}

type SQLiteCreateObjectParams struct {
	Name      string   `json:"name"`
	Type      string   `json:"type"`
	Query     string   `json:"query,omitempty"`
	OrReplace bool     `json:"orReplace,omitempty"`
	TableName string   `json:"tableName,omitempty"`
	Columns   []string `json:"columns,omitempty"`
}

type SQLiteUpdateObjectParams struct {
	Name      string   `json:"name"`
	Type      string   `json:"type"`
	Query     string   `json:"query,omitempty"`
	OrReplace bool     `json:"orReplace,omitempty"`
	TableName string   `json:"tableName,omitempty"`
	Columns   []string `json:"columns,omitempty"`
}
