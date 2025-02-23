package databaseSqlite

import (
	"database/sql"

	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"gorm.io/gorm"
)

type SQLiteRepository struct {
	db     *gorm.DB
	connID string
	cm     *databaseConnection.ConnectionManager
}

func NewSQLiteRepository(connID string, cm *databaseConnection.ConnectionManager) (*SQLiteRepository, error) {
	db, err := cm.GetConnection(databaseConnection.ConnectionInfo{
		ID:               connID,
		DBType:           "sqlite",
		ConnectionString: getConnectionString(connID), // فرضاً از یه تابع
	})
	if err != nil {
		return nil, err
	}
	return &SQLiteRepository{db: db, connID: connID, cm: cm}, nil
}

func (r *SQLiteRepository) BuildTree() (*databaseContract.TreeNode, error) {
	return buildTree(r)
}

func (r *SQLiteRepository) GetObjectData(nodeID, objType string) (interface{}, error) {
	return getObjectData(r, nodeID, objType)
}

func (r *SQLiteRepository) Create(params interface{}) error {
	return createObject(r, params)
}

func (r *SQLiteRepository) Drop(params interface{}) error {
	return dropObject(r, params)
}

func (r *SQLiteRepository) Update(params interface{}) error {
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

func getConnectionString(connID string) string {
	info := databaseConnection.GetConnectionInfoFromDB(connID)
	return info.ConnectionString // مثلاً "file:test.db"
}
