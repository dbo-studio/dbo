package dto

import "github.com/invopop/validation"

type (
	AiChatListRequest struct {
		ConnectionID int32  `query:"connectionId"`
		Search       string `query:"search"`
		PaginationRequest
	}

	AiChatListResponse struct {
		Chats []AiChatItem
	}
)

type (
	AiChatItem struct {
		ID        uint   `json:"id"`
		Title     string `json:"title"`
		Pinned    bool   `json:"pinned"`
		CreatedAt string `json:"createdAt"`
		UpdatedAt string `json:"updatedAt"`
	}
)

func (req AiChatListRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.Search, validation.Length(0, 200)),
		validation.Field(&req.Count, validation.Required, validation.Min(1), validation.Max(100)),
		validation.Field(&req.Page, validation.Required, validation.Min(1), validation.Max(100)),
	)
}
