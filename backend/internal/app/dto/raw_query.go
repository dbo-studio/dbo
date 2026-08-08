package dto

import "github.com/invopop/validation"

type (
	RawQueryRequest struct {
		ConnectionID int32   `json:"connectionId"`
		Query        string  `json:"query"`
		Database     *string `json:"database"`
		Schema       *string `json:"schema"`
		Confirmed    bool    `json:"confirmed"`
		Limit        *int    `json:"limit"`
		Page         *int    `json:"page"`
	}

	RawQueryResponse struct {
		Query          string           `json:"query"`
		Data           []map[string]any `json:"data"`
		Columns        []Column         `json:"columns"`
		Editable       bool             `json:"editable"`
		NodeID         string           `json:"nodeId"`
		EditableReason *string          `json:"editableReason"`
		DrivingTable   *string          `json:"drivingTable"`
		Paginated      bool             `json:"paginated"`
		Limit          int              `json:"limit"`
		Page           int              `json:"page"`
	}
)

type Column struct {
	Name         string   `json:"name"`
	Type         string   `json:"type"`
	NotNull      bool     `json:"notNull"`
	Length       *int64   `json:"length"`
	Default      *string  `json:"default"`
	Comment      *string  `json:"comment"`
	MappedType   string   `json:"mappedType"`
	Editable     bool     `json:"editable"`
	IsActive     bool     `json:"isActive"`
	IsPrimaryKey bool     `json:"isPrimaryKey"`
	IsForeignKey bool     `json:"isForeignKey"`
	EnumValues   []string `json:"enumValues,omitempty"`
	SourceTable  *string  `json:"sourceTable"`
	SourceColumn *string  `json:"sourceColumn"`
}

func (req RawQueryRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.Query, validation.Required),
		validation.Field(&req.Limit, validation.Min(1), validation.Max(10000)),
		validation.Field(&req.Page, validation.Min(1)),
	)
}
