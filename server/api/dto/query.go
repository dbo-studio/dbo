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
	ConnectionId int32        `json:"connection_id" validate:"required,gte=0"`
	Table        string       `json:"table" validate:"required"`
	Schema       string       `json:"schema" validate:"required"`
	EditedItems  []EditedItem `json:"items" validate:"dive"`
}

type EditedItem struct {
	ID    string `json:"id"`
	Value []map[string]interface{}
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
