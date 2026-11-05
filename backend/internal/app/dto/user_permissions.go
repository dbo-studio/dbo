package dto

type UserPermissions struct {
	CreateConnection bool `json:"createConnection"`
	AiSettings       bool `json:"aiSettings"`
	McpSettings      bool `json:"mcpSettings"`
	Cli              bool `json:"cli"`
	Import           bool `json:"import"`
	Export           bool `json:"export"`
	AiUse            bool `json:"aiUse"`
}
