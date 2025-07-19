package repository

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/db/scope"
	"github.com/dbo-studio/dbo/pkg/helper"
	"gorm.io/gorm"
)

var _ ISavedQueryRepo = (*ISavedQueryRepoImpl)(nil)

type ISavedQueryRepoImpl struct {
	db *gorm.DB
}

func NewSavedQueryRepo(db *gorm.DB) *ISavedQueryRepoImpl {
	return &ISavedQueryRepoImpl{
		db: db,
	}
}

func (I ISavedQueryRepoImpl) Index(_ context.Context, req *dto.SavedQueryListRequest) (*[]model.SavedQuery, error) {
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

func (I ISavedQueryRepoImpl) Find(_ context.Context, id int32) (*model.SavedQuery, error) {
	var query model.SavedQuery
	result := I.db.Where("id = ?", id).First(&query)

	return &query, result.Error
}

func (I ISavedQueryRepoImpl) Create(_ context.Context, dto *dto.CreateSavedQueryRequest) (*model.SavedQuery, error) {
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
	result := I.db.Save(&query)
	return &query, result.Error
}

func (I ISavedQueryRepoImpl) Delete(_ context.Context, query *model.SavedQuery) error {
	return I.db.Delete(query).Error
}

func (I ISavedQueryRepoImpl) Update(_ context.Context, query *model.SavedQuery, req *dto.UpdateSavedQueryRequest) (*model.SavedQuery, error) {
	if req.Name != nil && len(*req.Name) == 0 {
		query.Name = req.Query[0:10]
	} else {
		query.Name = helper.OptionalString(req.Name, query.Name)
	}

	query.Query = req.Query
	result := I.db.Save(&query)
	return query, result.Error
}
