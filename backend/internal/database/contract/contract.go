package databaseContract

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
)

type DatabaseRepository interface {
	RunQuery(dto *dto.RunQueryRequest) (*dto.RunQueryResponse, error)
	UpdateQuery(dto *dto.UpdateQueryRequest) (*dto.UpdateQueryResponse, error)
	RunRawQuery(dto *dto.RawQueryRequest) (*dto.RawQueryResponse, error)
	Tree(parentID string) (*TreeNode, error)
	Actions(nodeType TreeNodeType) []TreeNodeAction
	GetFormTabs(action TreeNodeActionName) []FormTab
	GetFormFields(nodeID string, tabID TreeTab) []FormField
	Objects(nodeID string, tabID TreeTab) ([]FormField, error)
	Execute(nodeID string, tabId TreeTab, action TreeNodeActionName, params []byte) error
}
