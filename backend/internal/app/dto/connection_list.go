package dto

type (
	ConnectionsResponse struct {
		Connections []Connection
	}
)

type (
	Connection struct {
		ID       int64  `json:"id"`
		Name     string `json:"name"`
		IsActive bool   `json:"isActive"`
		Icon     string `json:"icon"`
		Type     string `json:"type"`
		Info     string `json:"info"`
		Options  any    `json:"options"`
	}
)
