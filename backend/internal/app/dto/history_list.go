package dto

type (
	HistoryListRequest struct {
		PaginationRequest
	}

	HistoryListResponse struct {
		Items []HistoryListItem
	}
)

type (
	HistoryListItem struct {
		ID        int64  `json:"id"`
		Query     string `json:"query"`
		CreatedAt string `json:"created_at"`
	}
)
