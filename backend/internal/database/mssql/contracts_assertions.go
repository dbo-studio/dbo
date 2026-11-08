package databaseMssql

import generic "github.com/dbo-studio/dbo/internal/database/generic"

var (
	_ generic.Dialect     = mssql{}
	_ generic.Constraints = mssql{}
	_ generic.Dumper      = mssql{}
)
