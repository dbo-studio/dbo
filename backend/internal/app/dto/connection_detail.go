package dto

type (
	ConnectionDetailRequest struct {
		ConnectionId int32
	}
	ConnectionDetailResponse struct {
		ID       int64       `json:"id"`
		Name     string      `json:"name"`
		IsActive bool        `json:"isActive"`
		Info     string      `json:"info"`
		Icon     string      `json:"icon"`
		Auth     AuthDetails `json:"auth"`
	}

	AuthDetails struct {
		Database *string `json:"database"`
		Host     string  `json:"host"`
		Port     int32   `json:"port"`
		Username string  `json:"username"`
	}
)
