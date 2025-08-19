package dto

type (
	AiChatDetailRequest struct {
		AiChatId uint
	}

	AiChatDetailResponse struct {
		ID         uint        `json:"id"`
		Title      string      `json:"title"`
		ProviderId *uint       `json:"providerId"`
		Model      *string     `json:"model"`
		CreatedAt  string      `json:"createdAt"`
		Messages   []AiMessage `json:"messages"`
	}
)
