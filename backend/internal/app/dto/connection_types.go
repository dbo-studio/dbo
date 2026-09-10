package dto

import (
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

func connectionTypeValues() []any {
	out := make([]any, len(databaseContract.ValidConnectionTypes))
	for i, t := range databaseContract.ValidConnectionTypes {
		out[i] = t
	}

	return out
}
