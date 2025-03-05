package databaseContract

type TreeNode struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Type        string                 `json:"type"`
	Children    []TreeNode             `json:"children"`
	Action      *TreeNodeAction        `json:"action"`
	ContextMenu []TreeNodeAction       `json:"context_menu"`
	Metadata    map[string]interface{} `json:"metadata"`
}

type TreeNodeAction struct {
	Name   string                 `json:"name"`
	Type   TreeNodeActionType     `json:"type"`
	Params map[string]interface{} `json:"params"`
}

type TreeNodeActionType string

const (
	TreeNodeActionTypeForm    TreeNodeActionType = "form"
	TreeNodeActionTypeAction  TreeNodeActionType = "action"
	TreeNodeActionTypeCommand TreeNodeActionType = "command"
	TreeNodeActionTypeRoute   TreeNodeActionType = "route"
)

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
