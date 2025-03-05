package dto

import "github.com/invopop/validation"

type (
	RawQueryRequest struct {
		ConnectionId int32  `json:"connection_id" validate:"required,gte=0"`
		Query        string `json:"query" validate:"required,gte=0"`
	}

	RawQueryResponse struct {
		Query    string
		Data     []map[string]interface{}
		Columns  []Column
		IsQuery  bool
		Duration string
	}
)

type Column struct {
	Name       string  `json:"name"`
	Type       string  `json:"type"`
	NotNull    bool    `json:"not_null"`
	Length     *int32  `json:"length"`
	Default    *string `json:"default"`
	Comment    *string `json:"comment"`
	MappedType string  `json:"mapped_type"`
	Editable   bool    `json:"editable"`
	IsActive   bool    `json:"is_active"`
}

func (req RawQueryRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionId, validation.Required, validation.Min(0)),
		validation.Field(&req.Query, validation.Required),
	)
}
