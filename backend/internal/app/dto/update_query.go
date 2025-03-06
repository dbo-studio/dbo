package dto

import "github.com/invopop/validation"

type (
	UpdateQueryRequest struct {
		ConnectionId int32            `json:"connection_id" validate:"required,gte=0"`
		NodeId       string           `json:"table" validate:"required"`
		EditedItems  []EditedItem     `json:"edited" validate:"dive"`
		DeletedItems []map[string]any `json:"deleted"`
		AddedItems   []map[string]any `json:"added"`
	}

	UpdateQueryResponse struct {
		Query        []string
		RowsAffected int
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
