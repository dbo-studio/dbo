package dto

import databaseContract "github.com/dbo-studio/dbo/internal/database/contract"

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

type PostgresCreateDatabaseParams struct {
	Name     string `json:"name"`
	Owner    string `json:"owner,omitempty"`
	Encoding string `json:"encoding,omitempty"`
	Template string `json:"template,omitempty"`
}

type PostgresDropDatabaseParams struct {
	Name     string `json:"name"`
	IfExists bool   `json:"ifExists,omitempty"`
	Cascade  bool   `json:"cascade,omitempty"`
}

type PostgresCreateTableParams struct {
	Name    string                              `json:"name"`
	Columns []databaseContract.ColumnDefinition `json:"columns"`
	Temp    bool                                `json:"temp,omitempty"`
}

type PostgresUpdateTableParams struct {
	OldName    string                              `json:"oldName"`
	NewName    string                              `json:"newName"`
	AddColumns []databaseContract.ColumnDefinition `json:"addColumns"`
	Temp       bool                                `json:"temp,omitempty"`
}

type PostgresCreateObjectParams struct {
	Name      string   `json:"name"`
	Type      string   `json:"type"` // "schema", "view", "materialized_view", "index", "sequence"
	Query     string   `json:"query,omitempty"`
	OrReplace bool     `json:"orReplace,omitempty"`
	WithData  bool     `json:"withData,omitempty"`
	Owner     string   `json:"owner,omitempty"`
	TableName string   `json:"tableName,omitempty"` // برای Index
	Columns   []string `json:"columns,omitempty"`   // برای Index
}

type PostgresUpdateObjectParams struct {
	Name      string   `json:"name"`
	Type      string   `json:"type"`
	Query     string   `json:"query,omitempty"`
	OrReplace bool     `json:"orReplace,omitempty"`
	WithData  bool     `json:"withData,omitempty"`
	TableName string   `json:"tableName,omitempty"`
	Columns   []string `json:"columns,omitempty"`
}
