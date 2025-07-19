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
}
