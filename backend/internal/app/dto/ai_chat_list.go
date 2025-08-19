package dto

type (
	AiChatListResponse struct {
		Chats []AiChatItem
	}
)

type (
	AiChatItem struct {
		ID         uint    `json:"id"`
		Title      string  `json:"title"`
		ProviderId *uint   `json:"providerId"`
		Model      *string `json:"model"`
		CreatedAt  string  `json:"createdAt"`
	}
)
