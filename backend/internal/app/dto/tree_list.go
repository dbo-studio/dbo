package dto

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
