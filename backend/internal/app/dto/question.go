package dto

import (
	"time"

	"github.com/invopop/validation"
)

var questionChartTypes = []any{"table", "number", "bar", "row", "line", "area", "pie"}

type (
	// QuestionChart is how a report is drawn; the frontend chart kit reads it as is.
	QuestionChart struct {
		Type    string   `json:"type"`
		X       string   `json:"x,omitempty"`
		Y       []string `json:"y"`
		Stacked bool     `json:"stacked,omitempty"`
	}

	QuestionListRequest struct {
		ConnectionID int32 `query:"connectionId"`
	}

	QuestionCreateRequest struct {
		ConnectionID int32             `json:"connectionId"`
		Database     *string           `json:"database"`
		Schema       *string           `json:"schema"`
		Name         string            `json:"name"`
		SQL          string            `json:"sql"`
		Chart        QuestionChart     `json:"chart"`
		Params       map[string]string `json:"params"`
	}

	QuestionUpdateRequest struct {
		Name   *string            `json:"name"`
		SQL    *string            `json:"sql"`
		Chart  *QuestionChart     `json:"chart"`
		Params *map[string]string `json:"params"`
	}

	// QuestionFieldValuesRequest asks for the distinct values of a field filter's column, for its dropdown.
	QuestionFieldValuesRequest struct {
		ConnectionID int32   `json:"connectionId"`
		Database     *string `json:"database"`
		Schema       *string `json:"schema"`
		Field        string  `json:"field"`
	}

	// QuestionRunRequest carries values for the {{name}} filters in the report's SQL.
	QuestionRunRequest struct {
		Params map[string]string `json:"params"`
	}

	// QuestionPreviewRequest runs SQL from the editor before it is saved, the same read-only way a report runs.
	QuestionPreviewRequest struct {
		ConnectionID int32             `json:"connectionId"`
		Database     *string           `json:"database"`
		Schema       *string           `json:"schema"`
		SQL          string            `json:"sql"`
		Params       map[string]string `json:"params"`
	}

	QuestionResponse struct {
		ID           uint              `json:"id"`
		ConnectionID uint              `json:"connectionId"`
		Database     string            `json:"database,omitempty"`
		Schema       string            `json:"schema,omitempty"`
		Name         string            `json:"name"`
		SQL          string            `json:"sql"`
		Chart        QuestionChart     `json:"chart"`
		Params       map[string]string `json:"params"`
		UpdatedAt    time.Time         `json:"updatedAt"`
	}
)

func (c QuestionChart) Validate() error {
	return validation.ValidateStruct(&c,
		validation.Field(&c.Type, validation.Required, validation.In(questionChartTypes...)),
		validation.Field(&c.Y, validation.Length(0, 10)),
	)
}

func (req QuestionListRequest) Validate() error {
	return validation.ValidateStruct(&req, validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)))
}

func (req QuestionCreateRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.Name, validation.Required, validation.Length(1, 255)),
		validation.Field(&req.SQL, validation.Required, validation.Length(1, 20000)),
		validation.Field(&req.Chart),
		validation.Field(&req.Params, validation.Length(0, 50)),
	)
}

func (req QuestionUpdateRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Name, validation.NilOrNotEmpty, validation.Length(1, 255)),
		validation.Field(&req.SQL, validation.NilOrNotEmpty, validation.Length(1, 20000)),
		validation.Field(&req.Chart),
		validation.Field(&req.Params, validation.Length(0, 50)),
	)
}

func (req QuestionRunRequest) Validate() error {
	return validation.ValidateStruct(&req, validation.Field(&req.Params, validation.Length(0, 50)))
}

func (req QuestionPreviewRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.SQL, validation.Required, validation.Length(1, 20000)),
		validation.Field(&req.Params, validation.Length(0, 50)),
	)
}

func (req QuestionFieldValuesRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(1)),
		validation.Field(&req.Field, validation.Required, validation.Length(1, 255)),
	)
}
