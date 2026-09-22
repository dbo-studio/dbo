package repository

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/db/scope"
	"github.com/dbo-studio/dbo/pkg/helper"
	"gorm.io/gorm"
)

type IHistoryRepoImpl struct {
	db *gorm.DB
}

func NewHistoryRepo(db *gorm.DB) IHistoryRepo {
	return &IHistoryRepoImpl{
		db: db,
	}
}

func (h IHistoryRepoImpl) Index(ctx context.Context, req *dto.HistoryListRequest) (*[]model.History, error) {
	var histories []model.History

	result := h.db.WithContext(ctx).Scopes(scope.Paginate(&req.PaginationRequest)).
		Where("connection_id = ? AND owner_id = ?", req.ConnectionID, helper.CtxOwnerID(ctx)).
		Order("created_at desc").
		Find(&histories)

	if result.Error != nil {
		return nil, result.Error
	}

	return &histories, nil
}

func (h IHistoryRepoImpl) Create(ctx context.Context, connectionID uint, query string, isSystem bool) error {
	return h.db.Session(&gorm.Session{
		NewDB:                  true,
		SkipHooks:              true,
		SkipDefaultTransaction: true,
	}).Create(&model.History{
		OwnerID:      helper.CtxOwnerID(ctx),
		ConnectionID: connectionID,
		Query:        query,
		IsSystem:     isSystem,
	}).Error
}

func (h IHistoryRepoImpl) DeleteAll(ctx context.Context, connectionID uint) error {
	return h.db.WithContext(ctx).
		Where("connection_id = ? AND owner_id = ?", connectionID, helper.CtxOwnerID(ctx)).
		Delete(&model.History{}).Error
}
