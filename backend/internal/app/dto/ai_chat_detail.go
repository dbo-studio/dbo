package dto

type (
	AiChatDetailRequest struct {
		AiChatID uint
		PaginationRequest
	}

	AiChatDetailResponse struct {
		ID        uint        `json:"id"`
		Title     string      `json:"title"`
		CreatedAt string      `json:"createdAt"`
		Messages  []AiMessage `json:"messages"`
	}
)
