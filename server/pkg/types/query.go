package types

type RunQueryRequest struct {
	Table   string          `json:"table" validate:"required"`
	Limit   int32           `json:"limit" validate:"gte=1"`
	Offset  int32           `json:"offset" validate:"gte=0"`
	Filters []FilterRequest `json:"filters" validate:"dive"`
	Sorts   []SortRequest   `json:"sorts" validate:"dive"`
	Columns []string
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
