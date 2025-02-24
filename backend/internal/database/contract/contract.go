package databaseContract

import (
	"database/sql"

	"gorm.io/gorm"
)

type DatabaseRepository interface {
	BuildTree() (*TreeNode, error)
	GetObjectData(nodeID, objType string) (any, error)
	CreateObject(params any) error
	DropObject(params any) error
	UpdateObject(params any) error
	ExecuteQuery(query string, args ...any) (*sql.Rows, error)
	Execute(query string, args ...any) (*gorm.Statement, error)
	GetAvailableActions(nodeType string) []string
	GetFormFields(action string) []FormField
}
