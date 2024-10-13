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

func (h IHistoryRepoImpl) List(_ context.Context, pagination dto.PaginationRequest) (*[]model.History, error) {
	var histories []model.History

	result := h.db.Scopes(scope.Paginate(pagination)).Find(&histories)

	if result.Error != nil {
		return nil, result.Error
	}

	return &histories, nil
}
