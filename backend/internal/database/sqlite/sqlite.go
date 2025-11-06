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

// AiCompleteContext implements databaseContract.DatabaseRepository.
func (r *SQLiteRepository) AiCompleteContext(dto *dto.AiInlineCompleteRequest) string {
	panic("unimplemented")
}

// AiContext implements databaseContract.DatabaseRepository.
func (r *SQLiteRepository) AiContext(dto *dto.AiChatRequest) (string, error) {
	panic("unimplemented")
}

// SchemaDiagram implements databaseContract.DatabaseRepository.
func (r *SQLiteRepository) SchemaDiagram(dto *dto.SchemaDiagramRequest) (*dto.SchemaDiagramResponse, error) {
	panic("unimplemented: schema diagram is only supported for PostgreSQL")
}

// CreateRelationship implements databaseContract.DatabaseRepository.
func (r *SQLiteRepository) CreateRelationship(dto *dto.SaveRelationshipRequest) error {
	panic("unimplemented: schema diagram is only supported for PostgreSQL")
}

// DeleteRelationship implements databaseContract.DatabaseRepository.
func (r *SQLiteRepository) DeleteRelationship(dto *dto.DeleteRelationshipRequest) error {
	panic("unimplemented: schema diagram is only supported for PostgreSQL")
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
