package dto

type UserPermissions struct {
	CreateConnection bool `json:"createConnection"`
	AiSettings       bool `json:"aiSettings"`
	McpSettings      bool `json:"mcpSettings"`
}
