package dto

type (
	ConnectionDetailRequest struct {
		ConnectionId int32
	}
	ConnectionDetailResponse struct {
		ID       int64  `json:"id"`
		Name     string `json:"name"`
		IsActive bool   `json:"isActive"`
		Info     string `json:"info"`
		Icon     string `json:"icon"`
		Type     string `json:"type"`
		Options  any    `json:"options"`
	}
)
