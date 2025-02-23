package databaseContract

import (
	"database/sql"

	"gorm.io/gorm"
)

type DatabaseRepository interface {
	BuildTree() (*TreeNode, error)
	GetObjectData(nodeID, objType string) (interface{}, error)
	Create(params interface{}) error
	Drop(params interface{}) error
	Update(params interface{}) error
	ExecuteQuery(query string, args ...interface{}) (*sql.Rows, error)
	Execute(query string, args ...interface{}) (*gorm.Statement, error)
	GetAvailableActions(nodeType string) []string
	GetFormFields(action string) []FormField
}
