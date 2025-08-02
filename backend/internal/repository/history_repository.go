package repository

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/db/scope"
	"gorm.io/gorm"
)

var _ IHistoryRepo = (*IHistoryRepoImpl)(nil)

type IHistoryRepoImpl struct {
	db *gorm.DB
}

func NewHistoryRepo(db *gorm.DB) *IHistoryRepoImpl {
	return &IHistoryRepoImpl{
		db: db,
	}
}

func (h IHistoryRepoImpl) Index(_ context.Context, req *dto.HistoryListRequest) (*[]model.History, error) {
	var histories []model.History

	result := h.db.Scopes(scope.Paginate(&req.PaginationRequest)).
		Where("connection_id = ?", req.ConnectionId).
		Order("created_at desc").
		Find(&histories)

	if result.Error != nil {
		return nil, result.Error
	}

	return &histories, nil
}

func (h IHistoryRepoImpl) Create(ctx context.Context, connectionID uint, query string) error {
	return h.db.Session(&gorm.Session{
		NewDB:                  true,
		SkipHooks:              true,
		SkipDefaultTransaction: true,
	}).Create(&model.History{
		ConnectionID: connectionID,
		Query:        query,
	}).Error
}

func (I IHistoryRepoImpl) DeleteAll(_ context.Context, connectionID uint) error {
	return I.db.Where("connection_id = ?", connectionID).Delete(&model.History{}).Error
}
