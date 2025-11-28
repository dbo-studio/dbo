package databaseContract

import "time"

type TreeNode struct {
	ID          string           `json:"id"`
	Name        string           `json:"name"`
	Icon        *string          `json:"icon"`
	Type        TreeNodeType     `json:"type"`
	HasChildren bool             `json:"hasChildren"`
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
	ID        string                `json:"id"`
	Name      string                `json:"name"`
	Type      TreeFormFieldTypeEnum `json:"type"`
	Required  bool                  `json:"required"`
	Value     any                   `json:"value,omitempty"`
	Options   []FormFieldOption     `json:"options,omitempty"`
	DependsOn *FieldDependency      `json:"dependsOn,omitempty"`
}

type FormTab struct {
	ID   TreeTab `json:"id"`
	Name string  `json:"name"`
}

type FormResponse struct {
	IsArray bool             `json:"isArray"`
	Schema  []FormField      `json:"schema"`
	Data    []map[string]any `json:"data"`
}

type FormFieldOption struct {
	Value any    `json:"value"`
	Label string `json:"label"`
}

type FieldDependency struct {
	FieldID    string            `json:"fieldId"`
	Parameters map[string]string `json:"parameters"`
}

type DynamicFieldRequest struct {
	NodeID     string            `json:"nodeId"`
	TabID      TreeTab           `json:"tabId"`
	FieldID    string            `json:"fieldId"`
	Parameters map[string]string `json:"parameters"`
}

type ImportOptions struct {
	ContinueOnError bool `json:"continueOnError"`
	SkipErrors      bool `json:"skipErrors"`
	MaxErrors       int  `json:"maxErrors"`
}

type ImportResult struct {
	TotalRows   int                    `json:"totalRows"`
	SuccessRows int                    `json:"successRows"`
	FailedRows  int                    `json:"failedRows"`
	Errors      []ImportError          `json:"errors"`
	Duration    time.Duration          `json:"duration"`
	Metadata    map[string]interface{} `json:"metadata"`
}

type ImportError struct {
	Row     int    `json:"row"`
	Column  string `json:"column"`
	Message string `json:"message"`
	Value   string `json:"value"`
}

type ExportResult struct {
	ExportID  string    `json:"exportId"`
	Query     string    `json:"query"`
	Format    string    `json:"format"`
	TotalRows int       `json:"totalRows"`
	ChunkSize int       `json:"chunkSize"`
	CreatedAt time.Time `json:"createdAt"`
	Status    string    `json:"status"`
}

type ExportProgress struct {
	ExportID      string    `json:"exportId"`
	Status        string    `json:"status"`
	Progress      int       `json:"progress"`
	ProcessedRows int       `json:"processedRows"`
	TotalRows     int       `json:"totalRows"`
	CurrentChunk  int       `json:"currentChunk"`
	TotalChunks   int       `json:"totalChunks"`
	Message       string    `json:"message"`
	Error         string    `json:"error"`
	LastUpdated   time.Time `json:"lastUpdated"`
}
