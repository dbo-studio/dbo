package dto

type (
	SavedQueryListRequest struct {
		PaginationRequest
	}

	SavedQueryListResponse struct {
		Items []SavedQuery
	}
)

type (
	SavedQuery struct {
		ID        int64  `json:"id"`
		Name      string `json:"name"`
		Query     string `json:"query"`
		CreatedAt string `json:"createdAt"`
	}
)
