package dto

type (
	AutoCompleteRequest struct {
		ConnectionId int32  `query:"connection_id" validate:"required,gte=0"`
		FromCache    bool   `query:"from_cache"`
		Database     string `query:"database" validate:"required"`
		Schema       string `query:"schema" validate:"required"`
	}

	AutoCompleteResponse struct {
		Databases []string            `json:"databases"`
		Views     []string            `json:"views"`
		Schemas   []string            `json:"schemas"`
		Tables    []string            `json:"tables"`
		Columns   map[string][]string `json:"columns"`
	}
)
