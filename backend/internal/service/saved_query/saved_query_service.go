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
	Update(ctx context.Context, queryID int32, req *dto.UpdateSavedQueryRequest) (*dto.UpdateSavedQueryResponse, error)
	Delete(ctx context.Context, queryID int32) (*dto.SavedQueryListResponse, error)
}

var _ ISavedQueryService = (*ISavedQueryServiceImpl)(nil)

type ISavedQueryServiceImpl struct {
	savedQueryRepo repository.ISavedQueryRepo
	connectionRepo repository.IConnectionRepo
}

func NewSavedQueryService(savedQueryRepo repository.ISavedQueryRepo, connectionRepo repository.IConnectionRepo) *ISavedQueryServiceImpl {
	return &ISavedQueryServiceImpl{
		savedQueryRepo: savedQueryRepo,
		connectionRepo: connectionRepo,
	}
}

func (h ISavedQueryServiceImpl) requireConnection(ctx context.Context, connectionID int32) error {
	if _, err := h.connectionRepo.Find(ctx, connectionID); err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	return nil
}

func (h ISavedQueryServiceImpl) Index(ctx context.Context, dto *dto.SavedQueryListRequest) (*dto.SavedQueryListResponse, error) {
	if err := h.requireConnection(ctx, dto.ConnectionID); err != nil {
		return nil, err
	}

	result, err := h.savedQueryRepo.Index(ctx, dto)
	if err != nil {
		return nil, err
	}

	return indexRes(result), nil
}

func (h ISavedQueryServiceImpl) Create(ctx context.Context, dto *dto.CreateSavedQueryRequest) (*dto.CreateSavedQueryResponse, error) {
	if err := h.requireConnection(ctx, dto.ConnectionID); err != nil {
		return nil, err
	}

	savedQuery, err := h.savedQueryRepo.Create(ctx, dto)
	if err != nil {
		return nil, err
	}

	return createRes(savedQuery), nil
}

func (h ISavedQueryServiceImpl) Update(ctx context.Context, queryID int32, req *dto.UpdateSavedQueryRequest) (*dto.UpdateSavedQueryResponse, error) {
	query, err := h.savedQueryRepo.Find(ctx, queryID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrSavedQueryNotFound)
	}

	if err := h.requireConnection(ctx, int32(query.ConnectionID)); err != nil {
		return nil, apperror.NotFound(apperror.ErrSavedQueryNotFound)
	}

	updatedQuery, err := h.savedQueryRepo.Update(ctx, query, req)
	if err != nil {
		return nil, err
	}

	return updateRes(updatedQuery), nil
}

func (h ISavedQueryServiceImpl) Delete(ctx context.Context, queryID int32) (*dto.SavedQueryListResponse, error) {
	query, err := h.savedQueryRepo.Find(ctx, queryID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrSavedQueryNotFound)
	}

	if err := h.requireConnection(ctx, int32(query.ConnectionID)); err != nil {
		return nil, apperror.NotFound(apperror.ErrSavedQueryNotFound)
	}

	err = h.savedQueryRepo.Delete(ctx, query)
	if err != nil {
		return nil, err
	}

	return h.Index(ctx, &dto.SavedQueryListRequest{
		ConnectionID: int32(query.ConnectionID),
		PaginationRequest: dto.PaginationRequest{
			Page:  nil,
			Count: nil,
		},
	})
}
