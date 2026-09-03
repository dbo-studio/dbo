package dto

import (
	"strings"

	"github.com/invopop/validation"
)

type DiagramRequest struct {
	ConnectionID int32   `query:"connectionId"`
	Database     *string `query:"database"`
	Schema       *string `query:"schema"`
	Tables       *string `query:"tables"`
}

func (req DiagramRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
	)
}

func (req DiagramRequest) TableNames() []string {
	if req.Tables == nil {
		return nil
	}

	parts := strings.Split(*req.Tables, ",")
	names := make([]string, 0, len(parts))

	for _, part := range parts {
		name := strings.TrimSpace(part)
		if name != "" {
			names = append(names, name)
		}
	}

	return names
}
