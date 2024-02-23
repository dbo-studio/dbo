package dto

type RunQueryDto struct {
	ConnectionId int32       `json:"connection_id" validate:"required,gte=0"`
	Table        string      `json:"table" validate:"required"`
	Schema       string      `json:"schema" validate:"required"`
	Limit        int32       `json:"limit" validate:"gte=1,numeric"`
	Offset       int32       `json:"offset" validate:"gte=0,numeric"`
	Filters      []FilterDto `json:"filters" validate:"dive"`
	Sorts        []SortDto   `json:"sorts" validate:"dive"`
	Columns      []string
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
