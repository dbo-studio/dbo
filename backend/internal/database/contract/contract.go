package databaseContract

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
)

type DatabaseRepository interface {
	BuildTree(parentID string) (*TreeNode, error)
	GetObjectData(nodeID, objType string) (any, error)
	CreateObject(params any) error
	DropObject(params any) error
	UpdateObject(params any) error
	RunQuery(dto *dto.RunQueryRequest) (*dto.RunQueryResponse, error)
	RunRawQuery(dto *dto.RawQueryRequest) (*dto.RawQueryResponse, error)
	GetAvailableActions(nodeType string) []TreeNodeAction
	GetFormFields(action string) []FormField
}
