package databasePostgres

import (
	"database/sql"

	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"gorm.io/gorm"
)

type PostgresRepository struct {
	db             *gorm.DB
	connectionId   string
	connectionInfo databaseConnection.ConnectionInfo
}

func NewPostgresRepository(connectionId string, cm *databaseConnection.ConnectionManager) (*PostgresRepository, error) {
	cmInfo := getConnectionString(connectionId)

	db, err := cm.GetConnection(databaseConnection.ConnectionInfo{
		ID:               connectionId,
		DBType:           string(databaseContract.Postgresql),
		ConnectionString: cmInfo.ConnectionString,
	})

	if err != nil {
		return nil, err
	}

	return &PostgresRepository{
		db:             db,
		connectionId:   connectionId,
		connectionInfo: cmInfo,
	}, nil
}

func (r *PostgresRepository) BuildTree() (*databaseContract.TreeNode, error) {
	return buildTree(r)
}

func (r *PostgresRepository) GetObjectData(nodeID, objType string) (interface{}, error) {
	return getObjectData(r, nodeID, objType)
}

func (r *PostgresRepository) Create(params interface{}) error {
	return createObject(r, params)
}

func (r *PostgresRepository) Drop(params interface{}) error {
	return dropObject(r, params)
}

func (r *PostgresRepository) Update(params interface{}) error {
	return updateObject(r, params)
}

func (r *PostgresRepository) ExecuteQuery(query string, args ...interface{}) (*sql.Rows, error) {
	return executeQuery(r, query, args...)
}

func (r *PostgresRepository) Execute(query string, args ...interface{}) (*gorm.Statement, error) {
	return execute(r, query, args...)
}

func (r *PostgresRepository) GetAvailableActions(nodeType string) []string {
	return getAvailableActions(nodeType)
}

func (r *PostgresRepository) GetFormFields(action string) []databaseContract.FormField {
	return getFormFields(r, action)
}

func getConnectionString(connID string) databaseConnection.ConnectionInfo {
	info := databaseConnection.GetConnectionInfoFromDB(connID)
	return info
}
