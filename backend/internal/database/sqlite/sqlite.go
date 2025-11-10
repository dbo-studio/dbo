package databaseSqlite

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/cache"
	"gorm.io/gorm"
)

type SQLiteRepository struct {
	db         *gorm.DB
	connection *model.Connection
}

// Metadata implements databaseContract.DatabaseRepository.
func (r *SQLiteRepository) Metadata() (map[string]any, error) {
	panic("unimplemented")
}

// AiCompleteContext implements databaseContract.DatabaseRepository.
func (r *SQLiteRepository) AiCompleteContext(dto *dto.AiInlineCompleteRequest) string {
	panic("unimplemented")
}

// AiContext implements databaseContract.DatabaseRepository.
func (r *SQLiteRepository) AiContext(dto *dto.AiChatRequest) (string, error) {
	panic("unimplemented")
}

func NewSQLiteRepository(ctx context.Context, connection *model.Connection, cm *databaseConnection.ConnectionManager, cache cache.Cache) (contract.DatabaseRepository, error) {
	db, err := cm.GetConnection(ctx, connection)
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
