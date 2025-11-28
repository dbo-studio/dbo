package dto

import "github.com/invopop/validation"

type (
	TreeListRequest struct {
		ConnectionId int32  `json:"connectionId"`
		ParentId     string `json:"parentId"`
		FromCache    *bool  `json:"fromCache"`
	}

	ObjectTabsRequest struct {
		ConnectionId int32
		NodeId       string
		Action       string
	}

	ObjectDetailRequest struct {
		ConnectionId int32
		NodeId       string
		Action       string
		TabId        string
	}

	ObjectExecuteRequest struct {
		ConnectionId int32
		NodeId       string
		Action       string
		Params       []byte
	}

	DynamicFieldOptionsRequest struct {
		ConnectionId int32             `json:"connectionId"`
		NodeId       string            `json:"nodeId"`
		Parameters   map[string]string `json:"parameters"`
	}
)

func (req TreeListRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionId, validation.Required, validation.Min(0)),
	)
}
