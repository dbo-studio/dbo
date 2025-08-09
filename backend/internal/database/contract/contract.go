package databaseContract

import (
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
	// BuildDDLContext optionally returns a full DDL text; implementations may return empty and error=nil
	// Deprecated in this iteration; kept for future extension
	// BuildDDLContext(database *string, schema *string) (string, error)
	ImportData(job dto.ImportJob, rows [][]string, columns []string) (*ImportResult, error)
}
