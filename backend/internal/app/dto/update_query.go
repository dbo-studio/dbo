package dto

import "github.com/invopop/validation"

type (
	UpdateQueryRequest struct {
		ConnectionId int32            `json:"connectionId"`
		NodeId       string           `json:"nodeId"`
		EditedItems  []EditedItem     `json:"edited"`
		DeletedItems []map[string]any `json:"deleted"`
		AddedItems   []map[string]any `json:"added"`
	}

	UpdateQueryResponse struct {
		Query        []string `json:"query"`
		RowsAffected int      `json:"rowAffected"`
	}
)

type EditedItem struct {
	Conditions map[string]any `json:"conditions"`
	Values     map[string]any `json:"values"`
}

func (req UpdateQueryRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionId, validation.Required, validation.Min(0)),
		validation.Field(&req.NodeId, validation.Required, validation.Length(0, 120)),
		validation.Field(&req.EditedItems),
	)
}

func (req EditedItem) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Conditions, validation.Required),
		validation.Field(&req.Values, validation.Required),
	)
}
