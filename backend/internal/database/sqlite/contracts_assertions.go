package databaseSqlite

import databaseContract "github.com/dbo-studio/dbo/internal/database/contract"

// Compile-time assertions to guarantee SQLiteRepository satisfies
// all required repository contracts after refactors.
var (
	_ databaseContract.DatabaseRepository   = (*SQLiteRepository)(nil)
	_ databaseContract.AIContextRepository  = (*SQLiteRepository)(nil)
	_ databaseContract.AIMetadataRepository = (*SQLiteRepository)(nil)
	_ databaseContract.DBToolsRepository    = (*SQLiteRepository)(nil)
)
