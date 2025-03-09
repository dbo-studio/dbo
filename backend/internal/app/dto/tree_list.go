package dto

type (
	TreeListRequest struct {
		ConnectionId int32  `query:"connectionId"`
		ParentId     string `query:"parentId"`
	}

	ObjectTabsRequest struct {
		ConnectionId int32  `query:"connectionId"`
		Action       string `query:"action"`
	}

	ObjectFieldsRequest struct {
		ConnectionId int32  `query:"connectionId"`
		TabId        string `query:"tabId"`
		Action       string `query:"action"`
	}

	ObjectDetailRequest struct {
		ConnectionId int32  `query:"connectionId"`
		NodeId       string `query:"nodeId"`
		Type         string `query:"type"`
		TabId        string `query:"tabId"`
	}
)
