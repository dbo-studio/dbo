package databaseSqlite

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

type SQLiteRepository struct {
	db         *gorm.DB
	connection *model.Connection
}

// AutoComplete implements databaseContract.DatabaseRepository.
func (r *SQLiteRepository) AutoComplete(dto *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error) {
	panic("unimplemented")
}

// Execute implements databaseContract.DatabaseRepository.
func (r *SQLiteRepository) Execute(nodeID string, action contract.TreeNodeActionName, params []byte) error {
	panic("unimplemented")
}

// Objects implements databaseContract.DatabaseRepository.
func (r *SQLiteRepository) Objects(nodeID string, tabID contract.TreeTab, action contract.TreeNodeActionName) ([]contract.FormField, error) {
	panic("unimplemented")
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
