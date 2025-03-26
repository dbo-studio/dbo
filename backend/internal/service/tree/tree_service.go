package serviceTree

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

type ITreeService interface {
	Tree(ctx context.Context, req *dto.TreeListRequest) (*contract.TreeNode, error)
	Tabs(ctx context.Context, req *dto.ObjectTabsRequest) ([]contract.FormTab, error)
	TabObject(ctx context.Context, req *dto.ObjectFieldsRequest) ([]contract.FormField, error)
	ObjectDetail(ctx context.Context, req *dto.ObjectDetailRequest) ([]contract.FormField, error)
	ObjectExecute(ctx context.Context, req *dto.ObjectExecuteRequest) error
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

func (i ITreeServiceImpl) Tree(ctx context.Context, req *dto.TreeListRequest) (*contract.TreeNode, error) {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(connection, i.cm)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	tree, err := repo.Tree(req.ParentId)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return tree, nil
}

func (i ITreeServiceImpl) Tabs(ctx context.Context, req *dto.ObjectTabsRequest) ([]contract.FormTab, error) {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(connection, i.cm)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return repo.GetFormTabs(contract.TreeNodeActionName(req.Action)), nil
}

func (i ITreeServiceImpl) TabObject(ctx context.Context, req *dto.ObjectFieldsRequest) ([]contract.FormField, error) {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(connection, i.cm)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	fields := repo.GetFormFields(req.NodeId, contract.TreeTab(req.TabId), contract.TreeNodeActionName(req.Action))

	return fields, nil
}

func (i ITreeServiceImpl) ObjectDetail(ctx context.Context, req *dto.ObjectDetailRequest) ([]contract.FormField, error) {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(connection, i.cm)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	data, err := repo.Objects(req.NodeId, contract.TreeTab(req.TabId), contract.TreeNodeActionName(req.Action))
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}
	return data, nil
}

func (i *ITreeServiceImpl) ObjectExecute(ctx context.Context, req *dto.ObjectExecuteRequest) error {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionId)
	if err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(connection, i.cm)
	if err != nil {
		return apperror.InternalServerError(err)
	}

	err = repo.Execute(req.NodeId, contract.TreeNodeActionName(req.Action), req.Params)
	if err != nil {
		return apperror.InternalServerError(err)
	}
	return nil
}
