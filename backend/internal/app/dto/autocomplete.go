package dto

type (
	AutoCompleteRequest struct {
		ConnectionId int32  `query:"connectionId" validate:"required,gte=0"`
		FromCache    bool   `query:"fromCache"`
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
