package dto

import (
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

func connectionTypeValues() []any {
	out := make([]any, 0, len(databaseContract.ValidConnectionTypes)+1)
	for _, t := range databaseContract.ValidConnectionTypes {
		out = append(out, t)
	}

	if databaseContract.NoSQLFixtureEnabled() {
		out = append(out, databaseContract.NoSQLFixture)
	}

	return out
}
