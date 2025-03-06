package databaseContract

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
)

type DatabaseRepository interface {
	Tree(parentID string) (*TreeNode, error)
	Objects(nodeID, objType string) (any, error)
	CreateObject(params any) error
	DropObject(params any) error
	UpdateObject(params any) error
	RunQuery(dto *dto.RunQueryRequest) (*dto.RunQueryResponse, error)
	UpdateQuery(dto *dto.UpdateQueryRequest) (*dto.UpdateQueryResponse, error)
	RunRawQuery(dto *dto.RawQueryRequest) (*dto.RawQueryResponse, error)
	Actions(nodeType string) []TreeNodeAction
	FormFields(action string) []FormField
}
