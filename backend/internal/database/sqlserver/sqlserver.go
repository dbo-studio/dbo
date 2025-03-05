package databaseSqlserver

import (
	"database/sql"

	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

type SQLServerRepository struct {
	db         *gorm.DB
	connection *model.Connection
}

func NewSQLServerRepository(connection *model.Connection, cm *databaseConnection.ConnectionManager) (*SQLServerRepository, error) {
	db, err := cm.GetConnection(connection)
	if err != nil {
		return nil, err
	}
	return &SQLServerRepository{
		db:         db,
		connection: connection,
	}, nil
}

func (r *SQLServerRepository) BuildTree(parentID string) (*databaseContract.TreeNode, error) {
	return buildTree(r)
}

func (r *SQLServerRepository) GetObjectData(nodeID, objType string) (interface{}, error) {
	return getObjectData(r, nodeID, objType)
}

func (r *SQLServerRepository) CreateObject(params interface{}) error {
	return createObject(r, params)
}

func (r *SQLServerRepository) DropObject(params interface{}) error {
	return dropObject(r, params)
}

func (r *SQLServerRepository) UpdateObject(params interface{}) error {
	return updateObject(r, params)
}

func (r *SQLServerRepository) ExecuteQuery(query string, args ...interface{}) (*sql.Rows, error) {
	return executeQuery(r, query, args...)
}

func (r *SQLServerRepository) Execute(query string, args ...interface{}) (*gorm.Statement, error) {
	return execute(r, query, args...)
}

func (r *SQLServerRepository) GetAvailableActions(nodeType string) []databaseContract.TreeNodeAction {
	return getAvailableActions(nodeType)
}

func (r *SQLServerRepository) GetFormFields(action string) []databaseContract.FormField {
	return getFormFields(action)
}
