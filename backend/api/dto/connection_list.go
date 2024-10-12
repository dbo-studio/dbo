package dto

type (
	ConnectionsResponse struct {
		Connections []Connections
	}
)

type (
	Connections struct {
		ID       int64       `json:"id"`
		Name     string      `json:"name"`
		Type     string      `json:"type"`
		Driver   string      `json:"driver"`
		Auth     AuthDetails `json:"auth"`
		IsActive bool        `json:"is_active"`
	}
)
