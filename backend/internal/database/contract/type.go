package databaseContract

type TreeNode struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Type        TreeNodeType           `json:"type"`
	Children    []TreeNode             `json:"children"`
	Action      *TreeNodeAction        `json:"action"`
	ContextMenu []TreeNodeAction       `json:"contextMenu"`
	Metadata    map[string]interface{} `json:"metadata"`
}

type TreeNodeAction struct {
	Title  string                 `json:"title"`
	Name   TreeNodeActionName     `json:"name"`
	Type   TreeNodeActionType     `json:"type"`
	Params map[string]interface{} `json:"params"`
}

type FormField struct {
	ID       string            `json:"id"`
	Name     string            `json:"name"`
	Type     string            `json:"type"`
	Required bool              `json:"required"`
	Default  string            `json:"default,omitempty"`
	Options  []FormFieldOption `json:"options,omitempty"`
}

type FormFieldOption struct {
	Value string `json:"value"`
	Name  string `json:"name"`
}
