package repository

import (
	"context"

	"github.com/dbo-studio/dbo/api/dto"
	"github.com/dbo-studio/dbo/model"
)

type IConnectionRepo interface {
	CreateConnection(ctx context.Context, dto *dto.CreateConnectionRequest) (*model.Connection, error)
	FindConnection(ctx context.Context, id int32) (*model.Connection, error)
}

type Repository struct {
	ConnectionRepo IConnectionRepo
}

func NewRepository(ctx context.Context) *Repository {
	return &Repository{
		ConnectionRepo: NewConnectionRepo(),
	}
}