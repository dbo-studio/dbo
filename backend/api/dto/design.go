package dto

type DesignDto struct {
	ConnectionId int32            `json:"connection_id" validate:"required,gte=0"`
	Table        string           `json:"table" validate:"required"`
	Schema       string           `json:"schema" validate:"required"`
	Database     string           `json:"database" validate:"required"`
	EditedItems  []EditDesignItem `json:"edited" validate:"dive"`
	AddedItems   []AddDesignItem  `json:"added" validate:"dive"`
	DeletedItems []string         `json:"deleted"`
}

type EditDesignItem struct {
	Name    string             `json:"name" validate:"required"`
	Length  *string            `json:"length"`
	Type    *string            `json:"type"`
	IsNull  *bool              `json:"is_null"`
	Default *DesignItemDefault `json:"default"`
	Comment *string            `json:"comment"`
	Rename  *string            `json:"rename"`
}
type AddDesignItem struct {
	Name    string             `json:"name" validate:"required"`
	Length  *string            `json:"length"`
	Type    string             `json:"type" validate:"required"`
	IsNull  *bool              `json:"is_null"`
	Default *DesignItemDefault `json:"default"`
	Comment *string            `json:"comment"`
}

type DesignItemDefault struct {
	MakeNull  *bool   `json:"make_null"`
	MakeEmpty *bool   `json:"make_empty"`
	Value     *string `json:"value"`
}
