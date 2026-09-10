package dto

import databaseContract "github.com/dbo-studio/dbo/internal/database/contract"

// Filter predicates live with the query types in the database contract.

func FilterOperatorAllowed(operator string) bool {
	return databaseContract.FilterOperatorAllowed(operator)
}

func FilterRequiresValue(operator string) bool {
	return databaseContract.FilterRequiresValue(operator)
}

func FilterIsLikeOperator(operator string) bool {
	return databaseContract.FilterIsLikeOperator(operator)
}

func FilterPredicate(operator, value string) string {
	return databaseContract.FilterPredicate(operator, value)
}
