package dto

type (
	AiChatListResponse struct {
		Chats []AiChatItem
	}
)

type (
	AiChatItem struct {
		ID        uint   `json:"id"`
		Title     string `json:"title"`
		CreatedAt string `json:"createdAt"`
	}
)
