package dto

type DesignDto struct {
	ConnectionId int32               `json:"connection_id" validate:"required,gte=0"`
	Table        string              `json:"table" validate:"required"`
	Schema       string              `json:"schema" validate:"required"`
	Database     string              `json:"database" validate:"required"`
	EditedItems  []DesignItem        `json:"edited" validate:"dive"`
	AddedItems   []DesignItem        `json:"added" validate:"dive"`
	DeletedItems []map[string]string `json:"deleted"`
}

type DesignItem struct {
	Name    string             `json:"name" validate:"required"`
	Length  *string            `json:"length"`
	Type    *string            `json:"type"`
	IsNull  *bool              `json:"is_null"`
	Default *DesignItemDefault `json:"default"`
	Comment *string            `json:"comment"`
	Rename  *string            `json:"rename"`
}

type DesignItemDefault struct {
	MakeNull  *bool   `json:"make_null"`
	MakeEmpty *bool   `json:"make_empty"`
	Value     *string `json:"value"`
}
