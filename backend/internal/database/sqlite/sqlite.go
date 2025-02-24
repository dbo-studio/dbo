package databaseSqlite

import (
	"database/sql"

	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

type SQLiteRepository struct {
	db         *gorm.DB
	connection *model.Connection
}

func NewSQLiteRepository(connection *model.Connection, cm *databaseConnection.ConnectionManager) (databaseContract.DatabaseRepository, error) {
	db, err := cm.GetConnection(connection)
	if err != nil {
		return nil, err
	}
	return &SQLiteRepository{
		db:         db,
		connection: connection,
	}, nil
}

func (r *SQLiteRepository) BuildTree() (*databaseContract.TreeNode, error) {
	return buildTree(r)
}

func (r *SQLiteRepository) GetObjectData(nodeID, objType string) (interface{}, error) {
	return getObjectData(r, nodeID, objType)
}

func (r *SQLiteRepository) CreateObject(params interface{}) error {
	return createObject(r, params)
}

func (r *SQLiteRepository) DropObject(params interface{}) error {
	return dropObject(r, params)
}

func (r *SQLiteRepository) UpdateObject(params interface{}) error {
	return updateObject(r, params)
}

func (r *SQLiteRepository) ExecuteQuery(query string, args ...interface{}) (*sql.Rows, error) {
	return executeQuery(r, query, args...)
}

func (r *SQLiteRepository) Execute(query string, args ...interface{}) (*gorm.Statement, error) {
	return execute(r, query, args...)
}

func (r *SQLiteRepository) GetAvailableActions(nodeType string) []string {
	return getAvailableActions(nodeType)
}

func (r *SQLiteRepository) GetFormFields(action string) []databaseContract.FormField {
	return getFormFields(action)
}
