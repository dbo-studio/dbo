package databaseMysql

import (
	"database/sql"

	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

type MySQLRepository struct {
	db         *gorm.DB
	connection *model.Connection
}

func NewMySQLRepository(connection *model.Connection, cm *databaseConnection.ConnectionManager) (*MySQLRepository, error) {
	db, err := cm.GetConnection(connection)
	if err != nil {
		return nil, err
	}
	return &MySQLRepository{
		db:         db,
		connection: connection,
	}, nil
}

func (r *MySQLRepository) BuildTree(parentID string) (*databaseContract.TreeNode, error) {
	return buildTree(r)
}

func (r *MySQLRepository) GetObjectData(nodeID, objType string) (interface{}, error) {
	return getObjectData(r, nodeID, objType)
}

func (r *MySQLRepository) CreateObject(params interface{}) error {
	return createObject(r, params)
}

func (r *MySQLRepository) DropObject(params interface{}) error {
	return dropObject(r, params)
}

func (r *MySQLRepository) UpdateObject(params interface{}) error {
	return updateObject(r, params)
}

func (r *MySQLRepository) ExecuteQuery(query string, args ...interface{}) (*sql.Rows, error) {
	return executeQuery(r, query, args...)
}

func (r *MySQLRepository) Execute(query string, args ...interface{}) (*gorm.Statement, error) {
	return execute(r, query, args...)
}

func (r *MySQLRepository) GetAvailableActions(nodeType string) []databaseContract.TreeNodeAction {
	return getAvailableActions(nodeType)
}

func (r *MySQLRepository) GetFormFields(action string) []databaseContract.FormField {
	return getFormFields(r, action)
}
