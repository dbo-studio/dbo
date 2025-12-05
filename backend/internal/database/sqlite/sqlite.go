package databaseSqlite

import (
	"context"

	"github.com/dbo-studio/dbo/internal/container"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/logger"
	"gorm.io/gorm"
)

type SQLiteRepository struct {
	db         *gorm.DB
	connection *model.Connection
	cache      cache.Cache
	logger     logger.Logger
}

func (r *SQLiteRepository) GetFormSchema(ctx context.Context, nodeID string, tabID contract.TreeTab, action contract.TreeNodeActionName) []contract.FormField {
	switch action {
	case contract.CreateTableAction, contract.EditTableAction:
		switch tabID {
		case contract.TableTab:
			return r.tableFields(ctx, action)
		case contract.TableColumnsTab:
			return r.tableColumnFields()
		case contract.TableForeignKeysTab:
			return r.foreignKeyFields(ctx, nodeID)
		case contract.TableKeysTab:
			return r.keyFields(ctx, nodeID)
		case contract.TableIndexesTab:
			return r.indexOptions(ctx, nodeID)
		}
	case contract.CreateViewAction, contract.EditViewAction:
		if tabID == contract.ViewTab {
			return r.viewFields()
		}
	}
	return []contract.FormField{}
}

func NewSQLiteRepository(ctx context.Context, connection *model.Connection, cm *databaseConnection.ConnectionManager) (contract.DatabaseRepository, error) {
	db, err := cm.GetConnection(ctx, connection)
	if err != nil {
		return nil, err
	}

	return &SQLiteRepository{
		db:         db,
		connection: connection,
		cache:      container.Instance().Cache(),
		logger:     container.Instance().Logger(),
	}, nil
}

func (r *SQLiteRepository) Version(ctx context.Context) (string, error) {
	var version string
	result := r.db.WithContext(ctx).Raw("SELECT sqlite_version()").Scan(&version)

	return version, result.Error
}
