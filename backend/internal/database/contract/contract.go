package databaseContract

import (
	"database/sql"

	"gorm.io/gorm"
)

type DatabaseRepository interface {
	BuildTree(parentID string) (*TreeNode, error)
	GetObjectData(nodeID, objType string) (any, error)
	CreateObject(params any) error
	DropObject(params any) error
	UpdateObject(params any) error
	ExecuteQuery(query string, args ...any) (*sql.Rows, error)
	Execute(query string, args ...any) (*gorm.Statement, error)
	GetAvailableActions(nodeType string) []TreeNodeAction
	GetFormFields(action string) []FormField
}
