package dto

type RunQueryDto struct {
	ConnectionId int32       `json:"connection_id" validate:"required,gte=0"`
	Table        string      `json:"table" validate:"required"`
	Schema       string      `json:"schema" validate:"required"`
	Limit        int32       `json:"limit" validate:"gte=1,numeric,omitempty"`
	Offset       int32       `json:"offset" validate:"gte=0,numeric,omitempty"`
	Filters      []FilterDto `json:"filters" validate:"dive"`
	Sorts        []SortDto   `json:"sorts" validate:"dive"`
	Columns      []string
}

type RawQueryDto struct {
	ConnectionId int32  `json:"connection_id" validate:"required,gte=0"`
	Query        string `json:"query" validate:"required,gte=0"`
}

type UpdateQueryDto struct {
	ConnectionId int32            `json:"connection_id" validate:"required,gte=0"`
	Table        string           `json:"table" validate:"required"`
	Schema       string           `json:"schema" validate:"required"`
	Database     string           `json:"database" validate:"required"`
	EditedItems  []EditedItem     `json:"edited" validate:"dive"`
	DeletedItems []map[string]any `json:"deleted"`
	AddedItems   []map[string]any `json:"added"`
}

type EditedItem struct {
	Conditions map[string]any `json:"conditions" validate:"required"`
	Values     map[string]any `json:"values" validate:"required"`
}

type DeleteQueryDto struct {
	ConnectionId int32  `json:"connection_id" validate:"required,gte=0"`
	Query        string `json:"query" validate:"required,gte=0"`
}

type FilterDto struct {
	Column   string `json:"column" validate:"required"`
	Operator string `json:"operator" validate:"required"`
	Value    string `json:"value" validate:"required"`
	Next     string `json:"next" validate:"required"`
}

type SortDto struct {
	Column   string `json:"column" validate:"required"`
	Operator string `json:"operator" validate:"required"`
}
