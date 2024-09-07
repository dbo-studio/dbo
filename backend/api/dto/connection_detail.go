package dto

type (
	ConnectionDetailRequest struct {
		ConnectionId int32 `url:"id"`
		FromCache    bool  `query:"from_cache"`
	}
	ConnectionDetailResponse struct {
		ID              int64       `json:"id"`
		Name            string      `json:"name"`
		Type            string      `json:"type"`
		Driver          string      `json:"driver"`
		Version         string      `json:"version"`
		IsActive        bool        `json:"is_active"`
		CurrentDatabase string      `json:"current_database"`
		CurrentSchema   string      `json:"current_schema"`
		Auth            AuthDetails `json:"auth"`
		Databases       []string    `json:"databases"`
		Schemas         []string    `json:"schemas"`
		Tables          []string    `json:"tables"`
	}
)
