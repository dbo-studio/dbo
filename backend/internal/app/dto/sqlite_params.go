package dto

import databaseContract "github.com/dbo-studio/dbo/internal/database/contract"

type SQLiteCreateConnectionParams struct {
	Path string `json:"path"`
}

type SQLiteUpdateConnectionParams struct {
	Path *string `json:"path"`
}

type SQLiteCreateTableParams struct {
	Name    string                              `json:"name"`
	Columns []databaseContract.ColumnDefinition `json:"columns"`
}

// SQLiteUpdateTableParams برای ویرایش جدول در SQLite
type SQLiteUpdateTableParams struct {
	OldName    string                              `json:"oldName"`
	NewName    string                              `json:"newName"`
	AddColumns []databaseContract.ColumnDefinition `json:"addColumns"`
}

// SQLiteCreateObjectParams برای ساخت اشیا در SQLite (فقط View)
type SQLiteCreateObjectParams struct {
	Name      string   `json:"name"`
	Type      string   `json:"type"` // "view", "index"
	Query     string   `json:"query,omitempty"`
	OrReplace bool     `json:"orReplace,omitempty"`
	TableName string   `json:"tableName,omitempty"` // برای Index
	Columns   []string `json:"columns,omitempty"`   // برای Index
}

type SQLiteUpdateObjectParams struct {
	Name      string   `json:"name"`
	Type      string   `json:"type"` // "view", "index"
	Query     string   `json:"query,omitempty"`
	OrReplace bool     `json:"orReplace,omitempty"`
	TableName string   `json:"tableName,omitempty"`
	Columns   []string `json:"columns,omitempty"`
}
