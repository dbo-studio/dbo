package databaseContract

type DatabaseEnum string

const (
	Postgresql DatabaseEnum = "postgresql"
	Mysql      DatabaseEnum = "mysql"
	Sqlite     DatabaseEnum = "sqlite"
	SqlServer  DatabaseEnum = "sqlserver"
)
