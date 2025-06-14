package serviceSavedQuery

import (
	"context"
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

type ISavedQueryService interface {
	Index(ctx context.Context, dto *dto.SavedQueryListRequest) (*dto.SavedQueryListResponse, error)
	Create(ctx context.Context, dto *dto.CreateSavedQueryRequest) (*dto.CreateSavedQueryResponse, error)
	Update(ctx context.Context, queryId int32, req *dto.UpdateSavedQueryRequest) (*dto.UpdateSavedQueryResponse, error)
	Delete(ctx context.Context, queryId int32) (*dto.SavedQueryListResponse, error)
}

var _ ISavedQueryService = (*ISavedQueryServiceImpl)(nil)

type ISavedQueryServiceImpl struct {
	savedQueryRepo repository.ISavedQueryRepo
}

func NewSavedQueryService(savedQueryRepo repository.ISavedQueryRepo) *ISavedQueryServiceImpl {
	return &ISavedQueryServiceImpl{
		savedQueryRepo: savedQueryRepo,
	}
}

func (h ISavedQueryServiceImpl) Index(ctx context.Context, dto *dto.SavedQueryListRequest) (*dto.SavedQueryListResponse, error) {
	result, err := h.savedQueryRepo.Index(ctx, dto)
	if err != nil {
		return nil, err
	}

	return indexRes(result), nil
}

func (h ISavedQueryServiceImpl) Create(ctx context.Context, dto *dto.CreateSavedQueryRequest) (*dto.CreateSavedQueryResponse, error) {
	savedQuery, err := h.savedQueryRepo.Create(ctx, dto)
	if err != nil {
		return nil, err
	}

	return createRes(savedQuery), nil
}

func (h ISavedQueryServiceImpl) Update(ctx context.Context, queryId int32, req *dto.UpdateSavedQueryRequest) (*dto.UpdateSavedQueryResponse, error) {
	query, err := h.savedQueryRepo.Find(ctx, queryId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrSavedQueryNotFound)
	}

	updatedQuery, err := h.savedQueryRepo.Update(ctx, query, req)
	if err != nil {
		return nil, err
	}

	return updateRes(updatedQuery), nil
}

func (h ISavedQueryServiceImpl) Delete(ctx context.Context, queryId int32) (*dto.SavedQueryListResponse, error) {
	query, err := h.savedQueryRepo.Find(ctx, queryId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrSavedQueryNotFound)
	}

	err = h.savedQueryRepo.Delete(ctx, query)
	if err != nil {
		return nil, err
	}

	return h.Index(ctx, &dto.SavedQueryListRequest{
		PaginationRequest: dto.PaginationRequest{
			Page:  nil,
			Count: nil,
		},
	})
}
