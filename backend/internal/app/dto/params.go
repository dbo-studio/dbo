package dto

type MySQLCreateDatabaseParams struct {
	Name      string `json:"name"`
	Charset   string `json:"charset,omitempty"`
	Collation string `json:"collation,omitempty"`
}

type MySQLDropDatabaseParams struct {
	Name     string `json:"name"`
	IfExists bool   `json:"ifExists,omitempty"`
}

type MySQLCreateTableParams struct {
	Name    string             `json:"name"`
	Columns []ColumnDefinition `json:"columns"`
	Engine  string             `json:"engine,omitempty"`
}

type MySQLUpdateTableParams struct {
	OldName    string             `json:"oldName"`
	NewName    string             `json:"newName"`
	AddColumns []ColumnDefinition `json:"addColumns"`
	Engine     string             `json:"engine,omitempty"`
}

type MySQLCreateObjectParams struct {
	Name      string   `json:"name"`
	Type      string   `json:"type"`
	Query     string   `json:"query,omitempty"`
	OrReplace bool     `json:"orReplace,omitempty"`
	Charset   string   `json:"charset,omitempty"`
	Collation string   `json:"collation,omitempty"`
	TableName string   `json:"tableName,omitempty"`
	Columns   []string `json:"columns,omitempty"`
}

type MySQLUpdateObjectParams struct {
	Name      string   `json:"name"`
	Type      string   `json:"type"`
	Query     string   `json:"query,omitempty"`
	OrReplace bool     `json:"orReplace,omitempty"`
	TableName string   `json:"tableName,omitempty"`
	Columns   []string `json:"columns,omitempty"`
}

type DropTableParams struct {
	Name     string `json:"name"`
	IfExists bool   `json:"ifExists,omitempty"`
	Cascade  bool   `json:"cascade,omitempty"`
}

type DropObjectParams struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	IfExists bool   `json:"ifExists,omitempty"`
	Cascade  bool   `json:"cascade,omitempty"`
}

type SQLServerCreateDatabaseParams struct {
	Name string `json:"name"`
}

type SQLServerDropDatabaseParams struct {
	Name string `json:"name"`
}

type SQLServerCreateTableParams struct {
	Name    string             `json:"name"`
	Columns []ColumnDefinition `json:"columns"`
}

type SQLServerUpdateTableParams struct {
	OldName    string             `json:"oldName"`
	NewName    string             `json:"newName"`
	AddColumns []ColumnDefinition `json:"addColumns"`
}

type SQLServerCreateObjectParams struct {
	Name      string   `json:"name"`
	Type      string   `json:"type"`
	Query     string   `json:"query,omitempty"`
	OrReplace bool     `json:"orReplace,omitempty"`
	TableName string   `json:"tableName,omitempty"`
	Columns   []string `json:"columns,omitempty"`
}

type SQLServerUpdateObjectParams struct {
	Name      string   `json:"name"`
	Type      string   `json:"type"`
	Query     string   `json:"query,omitempty"`
	OrReplace bool     `json:"orReplace,omitempty"`
	TableName string   `json:"tableName,omitempty"`
	Columns   []string `json:"columns,omitempty"`
}
