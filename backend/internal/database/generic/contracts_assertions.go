package databaseGeneric

import databaseContract "github.com/dbo-studio/dbo/internal/database/contract"

var (
	_ databaseContract.DatabaseRepository = (*Repository)(nil)
	_ databaseContract.DBToolsRepository  = (*Repository)(nil)
)
