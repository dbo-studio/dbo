package dto

import "github.com/invopop/validation"

type (
	TreeListRequest struct {
		ConnectionId int32
		ParentId     string
	}

	ObjectTabsRequest struct {
		ConnectionId int32
		NodeId       string
		Action       string
	}

	ObjectFieldsRequest struct {
		ConnectionId int32
		NodeId       string
		TabId        string
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
)

func (req TreeListRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionId, validation.Required, validation.Min(0)),
	)
}
