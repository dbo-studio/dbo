package dto

type (
	McpStatusResponse struct {
		Enabled             bool   `json:"enabled"`
		Running             bool   `json:"running"`
		Port                int    `json:"port"`
		ProxyURL            string `json:"proxyUrl"`
		TokenMasked         string `json:"tokenMasked,omitempty"`
		DefaultConnectionID *uint  `json:"defaultConnectionId,omitempty"`
		Healthy             bool   `json:"healthy"`
	}
	McpUpdateRequest struct {
		Enabled             bool  `json:"enabled"`
		Port                *int  `json:"port"`
		DefaultConnectionID *uint `json:"defaultConnectionId"`
	}
)

type (
	McpUpdateResponse struct {
		Token string `json:"token,omitempty"`
		McpStatusResponse
	}

	McpRegenerateTokenResponse struct {
		Token string `json:"token"`
	}
)
