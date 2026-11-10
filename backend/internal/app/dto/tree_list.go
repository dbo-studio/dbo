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
		Confirmed    bool
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

func (req DynamicFieldOptionsRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.NodeID, validation.Required),
	)
}

type TreeSearchRequest struct {
	ConnectionID int32  `json:"connectionId"`
	Query        string `json:"query"`
	Limit        int    `json:"limit"`
}

func (req TreeSearchRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.Query, validation.Required, validation.Length(1, 100)),
		validation.Field(&req.Limit, validation.Min(0), validation.Max(500)),
	)
}
