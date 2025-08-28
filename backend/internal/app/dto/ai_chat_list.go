package dto

import "github.com/invopop/validation"

type (
	AiChatListRequest struct {
		ConnectionId int32 `query:"connectionId"`
		PaginationRequest
	}

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

func (req AiChatListRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionId, validation.Required, validation.Min(0)),
		validation.Field(&req.Count, validation.Required, validation.Min(1), validation.Max(100)),
		validation.Field(&req.Page, validation.Required, validation.Min(1), validation.Max(100)),
	)
}
