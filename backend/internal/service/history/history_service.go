package serviceHistory

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

type IHistoryService interface {
	Index(ctx context.Context, req *dto.HistoryListRequest) (*dto.HistoryListResponse, error)
	DeleteAll(ctx context.Context, req *dto.DeleteHistoryRequest) error
}

type IHistoryServiceImpl struct {
	historyRepo    repository.IHistoryRepo
	connectionRepo repository.IConnectionRepo
}

func NewHistoryService(hr repository.IHistoryRepo, connectionRepo repository.IConnectionRepo) IHistoryService {
	return &IHistoryServiceImpl{
		historyRepo:    hr,
		connectionRepo: connectionRepo,
	}
}

func (i IHistoryServiceImpl) requireConnection(ctx context.Context, connectionID int32) error {
	if _, err := i.connectionRepo.Find(ctx, connectionID); err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	return nil
}

func (i IHistoryServiceImpl) Index(ctx context.Context, req *dto.HistoryListRequest) (*dto.HistoryListResponse, error) {
	if err := i.requireConnection(ctx, req.ConnectionID); err != nil {
		return nil, err
	}

	histories, err := i.historyRepo.Index(ctx, req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	data := make([]dto.HistoryListItem, 0)
	for _, h := range lo.FromPtr(histories) {
		data = append(data, dto.HistoryListItem{
			ID:           int64(h.ID),
			ConnectionID: int32(h.ConnectionID),
			Query:        h.Query,
			CreatedAt:    h.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	return &dto.HistoryListResponse{
		Items: data,
	}, nil
}

func (i IHistoryServiceImpl) DeleteAll(ctx context.Context, req *dto.DeleteHistoryRequest) error {
	if err := i.requireConnection(ctx, req.ConnectionID); err != nil {
		return err
	}

	return i.historyRepo.DeleteAll(ctx, uint(req.ConnectionID))
}
