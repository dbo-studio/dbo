package databasePostgres

import (
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

type PostgresRepository struct {
	db         *gorm.DB
	connection *model.Connection
}

func NewPostgresRepository(connection *model.Connection, cm *databaseConnection.ConnectionManager) (contract.DatabaseRepository, error) {
	db, err := cm.GetConnection(connection)
	if err != nil {
		return nil, err
	}
	return &PostgresRepository{
		db:         db,
		connection: connection,
	}, nil
}
