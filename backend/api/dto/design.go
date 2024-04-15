package dto

type DesignDto struct {
	ConnectionId int32            `json:"connection_id" validate:"required,gte=0"`
	Table        string           `json:"table" validate:"required"`
	Schema       string           `json:"schema" validate:"required"`
	Database     string           `json:"database" validate:"required"`
	EditedItems  []EditedItem     `json:"edited" validate:"dive"`
	AddedItems   []map[string]any `json:"added"`
	DeletedItems []map[string]any `json:"deleted"`
}

type DesignItem struct {
}
