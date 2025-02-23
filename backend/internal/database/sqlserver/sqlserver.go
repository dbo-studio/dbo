package databaseSqlserver

import (
	"database/sql"

	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"gorm.io/gorm"
)

type SQLServerRepository struct {
	db     *gorm.DB
	connID string
	cm     *databaseConnection.ConnectionManager
}

func NewSQLServerRepository(connID string, cm *databaseConnection.ConnectionManager) (*SQLServerRepository, error) {
	db, err := cm.GetConnection(databaseConnection.ConnectionInfo{
		ID:               connID,
		DBType:           "sqlserver",
		ConnectionString: getConnectionString(connID), // فرضاً از یه تابع
	})
	if err != nil {
		return nil, err
	}
	return &SQLServerRepository{db: db, connID: connID, cm: cm}, nil
}

func (r *SQLServerRepository) BuildTree() (*databaseContract.TreeNode, error) {
	return buildTree(r)
}

func (r *SQLServerRepository) GetObjectData(nodeID, objType string) (interface{}, error) {
	return getObjectData(r, nodeID, objType)
}

func (r *SQLServerRepository) Create(params interface{}) error {
	return createObject(r, params)
}

func (r *SQLServerRepository) Drop(params interface{}) error {
	return dropObject(r, params)
}

func (r *SQLServerRepository) Update(params interface{}) error {
	return updateObject(r, params)
}

func (r *SQLServerRepository) ExecuteQuery(query string, args ...interface{}) (*sql.Rows, error) {
	return executeQuery(r, query, args...)
}

func (r *SQLServerRepository) Execute(query string, args ...interface{}) (*gorm.Statement, error) {
	return execute(r, query, args...)
}

func (r *SQLServerRepository) GetAvailableActions(nodeType string) []string {
	return getAvailableActions(nodeType)
}

func (r *SQLServerRepository) GetFormFields(action string) []databaseContract.FormField {
	return getFormFields(action)
}

func getConnectionString(connID string) string {
	info := databaseConnection.GetConnectionInfoFromDB(connID)
	return info.ConnectionString // مثلاً "sqlserver://user:password@localhost:1433?database=master"
}
