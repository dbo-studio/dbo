package serviceHistory

import (
	"context"
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

type IHistoryService interface {
	Index(ctx context.Context, dto *dto.HistoryListRequest) (*dto.HistoryListResponse, error)
}

var _ IHistoryService = (*IHistoryServiceImpl)(nil)

type IHistoryServiceImpl struct {
	historyRepo repository.IHistoryRepo
}

func NewHistoryService(hr repository.IHistoryRepo) *IHistoryServiceImpl {
	return &IHistoryServiceImpl{
		historyRepo: hr,
	}
}

func (i IHistoryServiceImpl) Index(ctx context.Context, req *dto.HistoryListRequest) (*dto.HistoryListResponse, error) {
	histories, err := i.historyRepo.Index(ctx, &req.PaginationRequest)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	data := make([]dto.HistoryListItem, 0)
	for _, h := range lo.FromPtr(histories) {
		data = append(data, dto.HistoryListItem{
			ID:        int64(h.ID),
			Query:     h.Query,
			CreatedAt: h.CreatedAt.Time.Format("2006-01-02 15:04:05"),
		})
	}

	return &dto.HistoryListResponse{
		Items: data,
	}, nil
}
