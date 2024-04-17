package dto

type DesignDto struct {
	ConnectionId int32               `json:"connection_id" validate:"required,gte=0"`
	Table        string              `json:"table" validate:"required"`
	Schema       string              `json:"schema" validate:"required"`
	Database     string              `json:"database" validate:"required"`
	EditedItems  []DesignItem        `json:"edited" validate:"dive"`
	AddedItems   []DesignItem        `json:"added"`
	DeletedItems []map[string]string `json:"deleted"`
}

type DesignItem struct {
	Name    string  `json:"name" validate:"required,min=1"`
	Length  *string `json:"length"`
	Type    *string `json:"type" validate:"required_with=length,min=1"`
	IsNull  *bool   `json:"is_null" validate:"boolean"`
	Default *string `json:"default" validate:"min=1"`
	Comment *string `json:"comment" validate:"min=1"`
	Rename  *string `json:"rename" validate:"min=1"`
}
