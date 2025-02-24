package dto

type (
	TreeListRequest struct {
		ConnectionId int32  `query:"connection_id"`
		ParentId     string `query:"parent_id"`
	}
)
