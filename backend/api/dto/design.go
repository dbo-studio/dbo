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
	Name    string `json:"name" validate:"required"`
	Type    string `json:"type" validate:"required"`
	Length  string `json:"length" validate:"required"`
	IsNull  bool   `json:"is_null" validate:"required"`
	Default string `json:"default" validate:"required"`
	Comment string `json:"comment" validate:"required"`
}
