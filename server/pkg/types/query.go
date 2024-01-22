package types

type RunQueryRequest struct {
	ConnectionId int32           `json:"connection_id" validate:"required,gte=0"`
	Table        string          `json:"table" validate:"required"`
	Limit        int32           `json:"limit" validate:"gte=1,numeric"`
	Offset       int32           `json:"offset" validate:"gte=0,numeric"`
	Filters      []FilterRequest `json:"filters" validate:"dive"`
	Sorts        []SortRequest   `json:"sorts" validate:"dive"`
	Columns      []string
}

type FilterRequest struct {
	Column   string `json:"column" validate:"required"`
	Operator string `json:"operator" validate:"required"`
	Value    string `json:"value" validate:"required"`
	Next     string `json:"next" validate:"required"`
}

type SortRequest struct {
	Column   string `json:"column" validate:"required"`
	Operator string `json:"operator" validate:"required"`
}
