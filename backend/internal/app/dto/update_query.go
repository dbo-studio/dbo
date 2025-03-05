package dto

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
