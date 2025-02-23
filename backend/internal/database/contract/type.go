package databaseContract

type ColumnDefinition struct {
	Name     string `json:"name"`
	DataType string `json:"dataType"`
	NotNull  bool   `json:"notNull,omitempty"`
	Primary  bool   `json:"primary,omitempty"`
	Default  string `json:"default,omitempty"`
}

type TreeNode struct {
	ID       string                 `json:"id"`
	Label    string                 `json:"label"`
	Type     string                 `json:"type"`
	Children []TreeNode             `json:"children"`
	Actions  []string               `json:"actions"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

type FormField struct {
	ID       string            `json:"id"`
	Label    string            `json:"label"`
	Type     string            `json:"type"`
	Required bool              `json:"required"`
	Default  string            `json:"default,omitempty"`
	Options  []FormFieldOption `json:"options,omitempty"`
}

type FormFieldOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
}
