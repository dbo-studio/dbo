package repository

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/container"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/db/scope"
	"github.com/dbo-studio/dbo/pkg/helper"
	"gorm.io/gorm"
)

type ISavedQueryRepoImpl struct {
	db *gorm.DB
}

func NewSavedQueryRepo() ISavedQueryRepo {
	return &ISavedQueryRepoImpl{
		db: container.Instance().DB(),
	}
}

func (I ISavedQueryRepoImpl) Index(ctx context.Context, req *dto.SavedQueryListRequest) (*[]model.SavedQuery, error) {
	var items []model.SavedQuery

	result := I.db.Scopes(scope.Paginate(&req.PaginationRequest)).
		Where("connection_id = ?", req.ConnectionId).
		Order("created_at desc").
		Find(&items)

	if result.Error != nil {
		return nil, result.Error
	}

	return &items, nil
}

func (I ISavedQueryRepoImpl) Find(ctx context.Context, id int32) (*model.SavedQuery, error) {
	var query model.SavedQuery
	result := I.db.WithContext(ctx).Where("id = ?", id).First(&query)

	return &query, result.Error
}

func (I ISavedQueryRepoImpl) Create(ctx context.Context, dto *dto.CreateSavedQueryRequest) (*model.SavedQuery, error) {
	var query model.SavedQuery
	if dto.Name == nil {
		if len(dto.Query) > 20 {
			query.Name = dto.Query[0:20]
		} else {
			query.Name = dto.Query
		}
	} else {
		query.Name = *dto.Name
	}

	query.ConnectionID = uint(dto.ConnectionId)
	query.Query = dto.Query
	result := I.db.WithContext(ctx).Save(&query)
	return &query, result.Error
}

func (I ISavedQueryRepoImpl) Delete(ctx context.Context, query *model.SavedQuery) error {
	return I.db.WithContext(ctx).Delete(query).Error
}

func (I ISavedQueryRepoImpl) Update(ctx context.Context, query *model.SavedQuery, req *dto.UpdateSavedQueryRequest) (*model.SavedQuery, error) {
	if req.Name != nil && len(*req.Name) == 0 {
		query.Name = req.Query[0:10]
	} else {
		query.Name = helper.OptionalString(req.Name, query.Name)
	}

	query.Query = req.Query
	result := I.db.WithContext(ctx).Save(&query)
	return query, result.Error
}
