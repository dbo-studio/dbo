package serviceTree

import (
	"context"

	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

type ITreeService interface {
	Tree(ctx context.Context, connectionId int32) (any, error)
}

var _ ITreeService = (*ITreeServiceImpl)(nil)

type ITreeServiceImpl struct {
	connectionRepo repository.IConnectionRepo
	cm             *databaseConnection.ConnectionManager
}

func NewTreeService(cr repository.IConnectionRepo, cm *databaseConnection.ConnectionManager) *ITreeServiceImpl {
	return &ITreeServiceImpl{
		connectionRepo: cr,
		cm:             cm,
	}
}

func (i ITreeServiceImpl) Tree(ctx context.Context, connectionId int32) (any, error) {
	connection, err := i.connectionRepo.Find(ctx, connectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(connection, i.cm)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	tree, err := repo.BuildTree()
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return tree, nil
}
