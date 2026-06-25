package dto

import "github.com/invopop/validation"

type (
	RawQueryRequest struct {
		ConnectionID int32  `json:"connectionId"`
		Query        string `json:"query"`
	}

	RawQueryResponse struct {
		Query   string           `json:"query"`
		Data    []map[string]any `json:"data"`
		Columns []Column         `json:"columns"`
	}
)

type Column struct {
	Name         string  `json:"name"`
	Type         string  `json:"type"`
	NotNull      bool    `json:"notNull"`
	Length       *int64  `json:"length"`
	Default      *string `json:"default"`
	Comment      *string `json:"comment"`
	MappedType   string  `json:"mappedType"`
	Editable     bool    `json:"editable"`
	IsActive     bool    `json:"isActive"`
	IsPrimaryKey bool    `json:"isPrimaryKey"`
}

func (req RawQueryRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.Query, validation.Required),
	)
}
