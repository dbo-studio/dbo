package dto

import "github.com/invopop/validation"

type (
	TreeListRequest struct {
		ConnectionID int32  `json:"connectionId"`
		ParentID     string `json:"parentId"`
		FromCache    *bool  `json:"fromCache"`
	}

	ObjectTabsRequest struct {
		ConnectionID int32
		NodeID       string
		Action       string
	}

	ObjectDetailRequest struct {
		ConnectionID int32
		NodeID       string
		Action       string
		TabID        string
	}

	ObjectExecuteRequest struct {
		ConnectionID int32
		NodeID       string
		Action       string
		Params       []byte
	}

	DynamicFieldOptionsRequest struct {
		ConnectionID int32             `json:"connectionId"`
		NodeID       string            `json:"nodeId"`
		Parameters   map[string]string `json:"parameters"`
	}
)

func (req TreeListRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
	)
}
