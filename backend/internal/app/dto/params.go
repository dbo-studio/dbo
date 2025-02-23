package dto

import (
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

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
	Name    string                              `json:"name"`
	Columns []databaseContract.ColumnDefinition `json:"columns"`
	Engine  string                              `json:"engine,omitempty"`
}

type MySQLUpdateTableParams struct {
	OldName    string                              `json:"oldName"`
	NewName    string                              `json:"newName"`
	AddColumns []databaseContract.ColumnDefinition `json:"addColumns"`
	Engine     string                              `json:"engine,omitempty"`
}

type MySQLCreateObjectParams struct {
	Name      string   `json:"name"`
	Type      string   `json:"type"` // "schema", "view", "index"
	Query     string   `json:"query,omitempty"`
	OrReplace bool     `json:"orReplace,omitempty"`
	Charset   string   `json:"charset,omitempty"`
	Collation string   `json:"collation,omitempty"`
	TableName string   `json:"tableName,omitempty"` // برای Index
	Columns   []string `json:"columns,omitempty"`   // برای Index
}

type MySQLUpdateObjectParams struct {
	Name      string   `json:"name"`
	Type      string   `json:"type"` // "view", "index"
	Query     string   `json:"query,omitempty"`
	OrReplace bool     `json:"orReplace,omitempty"`
	TableName string   `json:"tableName,omitempty"`
	Columns   []string `json:"columns,omitempty"`
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

// SQLServerCreateDatabaseParams برای ساخت دیتابیس در SQL Server
type SQLServerCreateDatabaseParams struct {
	Name string `json:"name"`
}

// SQLServerDropDatabaseParams برای حذف دیتابیس در SQL Server
type SQLServerDropDatabaseParams struct {
	Name string `json:"name"`
}

// SQLServerCreateTableParams برای ساخت جدول در SQL Server
type SQLServerCreateTableParams struct {
	Name    string                              `json:"name"`
	Columns []databaseContract.ColumnDefinition `json:"columns"`
}

// SQLServerUpdateTableParams برای ویرایش جدول در SQL Server
type SQLServerUpdateTableParams struct {
	OldName    string                              `json:"oldName"`
	NewName    string                              `json:"newName"`
	AddColumns []databaseContract.ColumnDefinition `json:"addColumns"`
}

// SQLServerCreateObjectParams برای ساخت اشیا در SQL Server
type SQLServerCreateObjectParams struct {
	Name      string   `json:"name"`
	Type      string   `json:"type"` // "view", "index"
	Query     string   `json:"query,omitempty"`
	OrReplace bool     `json:"orReplace,omitempty"`
	TableName string   `json:"tableName,omitempty"` // برای Index
	Columns   []string `json:"columns,omitempty"`   // برای Index
}

type SQLServerUpdateObjectParams struct {
	Name      string   `json:"name"`
	Type      string   `json:"type"` // "view", "index"
	Query     string   `json:"query,omitempty"`
	OrReplace bool     `json:"orReplace,omitempty"`
	TableName string   `json:"tableName,omitempty"`
	Columns   []string `json:"columns,omitempty"`
}
