package databaseSqlite

import (
	"context"

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
func (r *SQLiteRepository) AiCompleteContext(ctx context.Context, dto *dto.AiInlineCompleteRequest) string {
	panic("unimplemented")
}

// AiContext implements databaseContract.DatabaseRepository.
func (r *SQLiteRepository) AiContext(ctx context.Context, dto *dto.AiChatRequest) (string, error) {
	panic("unimplemented")
}

func NewSQLiteRepository(ctx context.Context, connection *model.Connection, cm *databaseConnection.ConnectionManager) (contract.DatabaseRepository, error) {
	db, err := cm.GetConnection(ctx, connection)
	if err != nil {
		return nil, err
	}

	return &SQLiteRepository{
		db:         db,
		connection: connection,
	}, nil
}

func (r *SQLiteRepository) Version(ctx context.Context) (string, error) {
	var version string
	result := r.db.WithContext(ctx).Raw("SELECT sqlite_version()").Scan(&version)

	return version, result.Error
}
