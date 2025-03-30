package dto

type (
	ConnectionsResponse struct {
		Connections []Connection
	}
)

type (
	Connection struct {
		ID       int64       `json:"id"`
		Name     string      `json:"name"`
		Auth     AuthDetails `json:"auth"`
		IsActive bool        `json:"isActive"`
		Info     string      `json:"info"`
		Icon     string      `json:"icon"`
	}
)
