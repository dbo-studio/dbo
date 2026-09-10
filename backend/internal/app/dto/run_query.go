package dto

import "github.com/dbo-studio/dbo/internal/database/contract"

// Query-flow types live in the database contract; these aliases keep the
// HTTP layer's naming stable without the contract depending on app DTOs.
type (
	RunQueryRequest  = databaseContract.RunQueryRequest
	RunQueryResponse = databaseContract.RunQueryResponse
	FilterDto        = databaseContract.FilterDto
	SortDto          = databaseContract.SortDto
)
