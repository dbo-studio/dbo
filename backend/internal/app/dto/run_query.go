package dto

import (
	"github.com/invopop/validation"
)

type (
	RunQueryRequest struct {
		ConnectionId int32       `json:"connection_id"`
		NodeId       string      `json:"node_id"`
		Limit        *int        `json:"limit"`
		Offset       *int        `json:"offset"`
		Filters      []FilterDto `json:"filters"`
		Sorts        []SortDto   `json:"sorts"`
		Columns      []string
	}

	RunQueryResponse struct {
		Query   string   `json:"query"`
		Data    any      `json:"data"`
		Columns []Column `json:"columns"`
	}
)

type FilterDto struct {
	Column   string `json:"column"`
	Operator string `json:"operator"`
	Value    string `json:"value"`
	Next     string `json:"next"`
}

type SortDto struct {
	Column   string `json:"column"`
	Operator string `json:"operator"`
}

func (req RunQueryRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionId, validation.Required, validation.Min(0)),
		validation.Field(&req.NodeId, validation.Required, validation.Length(0, 120)),
		validation.Field(&req.Limit, validation.Min(1)),
		validation.Field(&req.Offset, validation.Min(1)),
		validation.Field(&req.Filters),
		validation.Field(&req.Sorts),
	)
}

func (req FilterDto) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Column, validation.Required, validation.Length(12, 120)),
		validation.Field(&req.Operator, validation.Required),
		validation.Field(&req.Value, validation.Required),
		validation.Field(&req.Next, validation.Required),
	)
}

func (req SortDto) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Column, validation.Required),
		validation.Field(&req.Operator, validation.Required),
	)
}
