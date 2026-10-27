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
		ConnectionID int32         `json:"connectionId"`
		Database     *string       `json:"database"`
		Schema       *string       `json:"schema"`
		Name         string        `json:"name"`
		SQL          string        `json:"sql"`
		Chart        QuestionChart `json:"chart"`
	}

	QuestionUpdateRequest struct {
		Name  *string        `json:"name"`
		SQL   *string        `json:"sql"`
		Chart *QuestionChart `json:"chart"`
	}

	QuestionResponse struct {
		ID           uint          `json:"id"`
		ConnectionID uint          `json:"connectionId"`
		Database     string        `json:"database,omitempty"`
		Schema       string        `json:"schema,omitempty"`
		Name         string        `json:"name"`
		SQL          string        `json:"sql"`
		Chart        QuestionChart `json:"chart"`
		UpdatedAt    time.Time     `json:"updatedAt"`
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
	)
}

func (req QuestionUpdateRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Name, validation.NilOrNotEmpty, validation.Length(1, 255)),
		validation.Field(&req.SQL, validation.NilOrNotEmpty, validation.Length(1, 20000)),
		validation.Field(&req.Chart),
	)
}
