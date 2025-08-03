package databaseSqlite

import (
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

type SQLiteRepository struct {
	db         *gorm.DB
	connection *model.Connection
}

func NewSQLiteRepository(connection *model.Connection, cm *databaseConnection.ConnectionManager) (contract.DatabaseRepository, error) {
	db, err := cm.GetConnection(connection)
	if err != nil {
		return nil, err
	}
	return &SQLiteRepository{
		db:         db,
		connection: connection,
	}, nil
}

func (r *SQLiteRepository) Version() (string, error) {
	var version string
	result := r.db.Raw("SELECT sqlite_version()").Scan(&version)

	return version, result.Error
}
