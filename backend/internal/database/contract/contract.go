package databaseContract

import (
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
)

type DatabaseRepository interface {
	Version() (string, error)
	RunQuery(dto *dto.RunQueryRequest) (*dto.RunQueryResponse, error)
	UpdateQuery(dto *dto.UpdateQueryRequest) (*dto.UpdateQueryResponse, error)
	RunRawQuery(dto *dto.RawQueryRequest) (*dto.RawQueryResponse, error)
	Tree(parentID string) (*TreeNode, error)
	GetFormTabs(action TreeNodeActionName) []FormTab
	GetFormFields(nodeID string, tabID TreeTab, action TreeNodeActionName) []FormField
	Objects(nodeID string, tabID TreeTab, action TreeNodeActionName) ([]FormField, error)
	Execute(nodeID string, action TreeNodeActionName, params []byte) error
	AutoComplete(dto *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error)
	ImportData(job dto.ImportJob, rows [][]string, columns []string) (*ImportResult, error)
	ExportData(query string, format string, chunkSize int) (*ExportResult, error)
}

// Import/Export related structs
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
