package dto

type (
	TreeListRequest struct {
		ConnectionId int32  `query:"connectionId"`
		ParentId     string `query:"parentId"`
	}
)
