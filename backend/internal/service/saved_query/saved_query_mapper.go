package serviceSavedQuery

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/samber/lo"
)

func createRes(sq *model.SavedQuery) *dto.CreateSavedQueryResponse {
	return &dto.CreateSavedQueryResponse{
		SavedQuery: dto.SavedQuery{
			ID:           int64(sq.ID),
			ConnectionId: int32(sq.ConnectionID),
			Name:         sq.Name,
			Query:        sq.Query,
			CreatedAt:    sq.CreatedAt.Format("2006-01-02 15:04:05"),
		},
	}
}

func updateRes(sq *model.SavedQuery) *dto.UpdateSavedQueryResponse {
	return &dto.UpdateSavedQueryResponse{
		SavedQuery: dto.SavedQuery{
			ID:           int64(sq.ID),
			ConnectionId: int32(sq.ConnectionID),
			Name:         sq.Name,
			Query:        sq.Query,
			CreatedAt:    sq.CreatedAt.Format("2006-01-02 15:04:05"),
		},
	}
}

func indexRes(queries *[]model.SavedQuery) *dto.SavedQueryListResponse {
	data := make([]dto.SavedQuery, 0)
	for _, query := range lo.FromPtr(queries) {
		data = append(data, dto.SavedQuery{
			ID:           int64(query.ID),
			ConnectionId: int32(query.ConnectionID),
			Name:         query.Name,
			Query:        query.Query,
			CreatedAt:    query.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	return &dto.SavedQueryListResponse{
		Items: data,
	}
}
