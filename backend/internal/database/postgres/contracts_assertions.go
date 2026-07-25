package databasePostgres

import databaseContract "github.com/dbo-studio/dbo/internal/database/contract"

// Compile-time assertions to guarantee PostgresRepository satisfies
// all required repository contracts after refactors.
var (
	_ databaseContract.DatabaseRepository   = (*PostgresRepository)(nil)
	_ databaseContract.AIContextRepository  = (*PostgresRepository)(nil)
	_ databaseContract.AIMetadataRepository = (*PostgresRepository)(nil)
	_ databaseContract.DBToolsRepository    = (*PostgresRepository)(nil)
)
