package dto

import "github.com/invopop/validation"

type (
	UpdateQueryRequest struct {
		ConnectionId int32            `json:"connection_id" validate:"required,gte=0"`
		Table        string           `json:"table" validate:"required"`
		Schema       string           `json:"schema" validate:"required"`
		Database     string           `json:"database" validate:"required"`
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

func (req EditedItem) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Conditions, validation.Required),
		validation.Field(&req.Values, validation.Required),
	)
}
