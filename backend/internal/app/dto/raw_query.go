package dto

import (
	"github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/invopop/validation"
)

type (
	RawQueryRequest  = databaseContract.RawQueryRequest
	RawQueryResponse = databaseContract.RawQueryResponse
	Column           = databaseContract.Column
)

// TransactionRequest names the editor tab's transaction on a connection.
type TransactionRequest struct {
	ConnectionID int32  `json:"connectionId" query:"connectionId"`
	Tab          string `json:"tab" query:"tab"`
	Database     string `json:"database" query:"database"`
}

func (req TransactionRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.Tab, validation.Required),
	)
}
