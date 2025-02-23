package databaseMysql

import (
	"database/sql"

	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"gorm.io/gorm"
)

type MySQLRepository struct {
	db     *gorm.DB
	connID string
	cm     *databaseConnection.ConnectionManager
}

func NewMySQLRepository(connID string, cm *databaseConnection.ConnectionManager) (*MySQLRepository, error) {
	db, err := cm.GetConnection(databaseConnection.ConnectionInfo{
		ID:               connID,
		DBType:           "mysql",
		ConnectionString: getConnectionString(connID), // فرضاً از یه تابع
	})
	if err != nil {
		return nil, err
	}
	return &MySQLRepository{db: db, connID: connID, cm: cm}, nil
}

func (r *MySQLRepository) BuildTree() (*databaseContract.TreeNode, error) {
	return buildTree(r)
}

func (r *MySQLRepository) GetObjectData(nodeID, objType string) (interface{}, error) {
	return getObjectData(r, nodeID, objType)
}

func (r *MySQLRepository) Create(params interface{}) error {
	return createObject(r, params)
}

func (r *MySQLRepository) Drop(params interface{}) error {
	return dropObject(r, params)
}

func (r *MySQLRepository) Update(params interface{}) error {
	return updateObject(r, params)
}

func (r *MySQLRepository) ExecuteQuery(query string, args ...interface{}) (*sql.Rows, error) {
	return executeQuery(r, query, args...)
}

func (r *MySQLRepository) Execute(query string, args ...interface{}) (*gorm.Statement, error) {
	return execute(r, query, args...)
}

func (r *MySQLRepository) GetAvailableActions(nodeType string) []string {
	return getAvailableActions(nodeType)
}

func (r *MySQLRepository) GetFormFields(action string) []databaseContract.FormField {
	return getFormFields(r, action)
}

func getConnectionString(connID string) string {
	info := databaseConnection.GetConnectionInfoFromDB(connID)
	return info.ConnectionString // مثلاً "user:password@tcp(127.0.0.1:3306)/dbname"
}
