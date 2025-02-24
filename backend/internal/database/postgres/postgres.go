package databasePostgres

import (
	"database/sql"

	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

type PostgresRepository struct {
	db         *gorm.DB
	connection *model.Connection
}

func NewPostgresRepository(connection *model.Connection, cm *databaseConnection.ConnectionManager) (databaseContract.DatabaseRepository, error) {
	db, err := cm.GetConnection(connection)
	if err != nil {
		return nil, err
	}
	return &PostgresRepository{
		db:         db,
		connection: connection,
	}, nil
}

func (r *PostgresRepository) BuildTree() (*databaseContract.TreeNode, error) {
	return buildTree(r)
}

func (r *PostgresRepository) GetObjectData(nodeID, objType string) (any, error) {
	return getObjectData(r, nodeID, objType)
}

func (r *PostgresRepository) CreateObject(params any) error {
	return createObject(r, params)
}

func (r *PostgresRepository) DropObject(params any) error {
	return dropObject(r, params)
}

func (r *PostgresRepository) UpdateObject(params any) error {
	return updateObject(r, params)
}

func (r *PostgresRepository) ExecuteQuery(query string, args ...any) (*sql.Rows, error) {
	return executeQuery(r, query, args...)
}

func (r *PostgresRepository) Execute(query string, args ...any) (*gorm.Statement, error) {
	return execute(r, query, args...)
}

func (r *PostgresRepository) GetAvailableActions(nodeType string) []string {
	return getAvailableActions(nodeType)
}

func (r *PostgresRepository) GetFormFields(action string) []databaseContract.FormField {
	return getFormFields(r, action)
}
