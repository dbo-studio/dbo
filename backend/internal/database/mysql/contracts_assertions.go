package databaseMysql

import databaseContract "github.com/dbo-studio/dbo/internal/database/contract"

var (
	_ databaseContract.DatabaseRepository   = (*MySQLRepository)(nil)
	_ databaseContract.AIContextRepository  = (*MySQLRepository)(nil)
	_ databaseContract.AIMetadataRepository = (*MySQLRepository)(nil)
	_ databaseContract.DBToolsRepository    = (*MySQLRepository)(nil)
)
