package dto

type (
	HistoryListRequest struct {
		ConnectionId int32 `query:"connectionId"`
		PaginationRequest
	}

	HistoryListResponse struct {
		Items []HistoryListItem
	}
)

type (
	HistoryListItem struct {
		ID           int64  `json:"id"`
		ConnectionId int32  `json:"connectionId"`
		Query        string `json:"query"`
		CreatedAt    string `json:"createdAt"`
	}
)
