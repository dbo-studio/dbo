package dto

type (
	TreeListRequest struct {
		ConnectionId int32  `query:"connectionId"`
		ParentId     string `query:"parentId"`
	}

	ObjectTabsRequest struct {
		ConnectionId int32 `query:"connectionId"`
		NodeId       string
		Action       string
	}

	ObjectFieldsRequest struct {
		ConnectionId int32 `query:"connectionId"`
		NodeId       string
		TabId        string
		Action       string
	}

	ObjectDetailRequest struct {
		ConnectionId int32 `query:"connectionId"`
		NodeId       string
		Action       string
		TabId        string
		Type         string
	}
)
