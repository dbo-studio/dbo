package databaseContract

type TreeNode struct {
	ID          string           `json:"id"`
	Name        string           `json:"name"`
	Icon        *string          `json:"icon"`
	Type        TreeNodeType     `json:"type"`
	Children    []TreeNode       `json:"children"`
	Action      *TreeNodeAction  `json:"action"`
	ContextMenu []TreeNodeAction `json:"contextMenu"`
	Metadata    map[string]any   `json:"metadata"`
}

type TreeNodeAction struct {
	Title  string             `json:"title"`
	Name   TreeNodeActionName `json:"name"`
	Type   TreeNodeActionType `json:"type"`
	Params map[string]any     `json:"params"`
}

type FormField struct {
	ID       string      `json:"id"`
	Name     string      `json:"name"`
	Type     string      `json:"type"`
	Required bool        `json:"required"`
	Value    any         `json:"value"`
	Fields   []FormField `json:"fields,omitempty"`
}

type FormTab struct {
	ID   TreeTab `json:"id"`
	Name string  `json:"name"`
}
