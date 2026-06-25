package serviceTree

import (
	"context"
	"fmt"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/container"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/samber/lo"
)

type ITreeService interface {
	Tree(ctx context.Context, req *dto.TreeListRequest) (*contract.TreeNode, error)
	Tabs(ctx context.Context, req *dto.ObjectTabsRequest) ([]contract.FormTab, error)
	ObjectDetail(ctx context.Context, req *dto.ObjectDetailRequest) (*contract.FormResponse, error)
	GetDynamicFieldOptions(ctx context.Context, req *dto.DynamicFieldOptionsRequest) ([]contract.FormFieldOption, error)
	ObjectExecute(ctx context.Context, req *dto.ObjectExecuteRequest) error
	ObjectPreviewExecute(ctx context.Context, req *dto.ObjectExecuteRequest) ([]string, error)
}

var _ ITreeService = (*ITreeServiceImpl)(nil)

type ITreeServiceImpl struct {
	connectionRepo repository.IConnectionRepo
	cm             *databaseConnection.ConnectionManager
	cache          cache.Cache
}

func NewTreeService(cr repository.IConnectionRepo, cm *databaseConnection.ConnectionManager) *ITreeServiceImpl {
	return &ITreeServiceImpl{
		connectionRepo: cr,
		cm:             cm,
		cache:          container.Instance().Cache(),
	}
}

func (i ITreeServiceImpl) Tree(ctx context.Context, req *dto.TreeListRequest) (*contract.TreeNode, error) {
	if lo.FromPtr(req.FromCache) {
		var tree *contract.TreeNode
		err := i.cache.Get(ctx, i.cacheName(req), &tree)
		if err == nil && tree != nil {
			return tree, nil
		}
	}

	connection, err := i.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	err = i.cache.DeleteByPrefix(ctx, fmt.Sprintf("c:%d", connection.ID))
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	repo, err := database.NewDatabaseRepository(ctx, connection, i.cm)
	if err != nil {
		return nil, err
	}

	tree, err := repo.Tree(ctx, req.ParentID)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	err = i.cache.Set(ctx, i.cacheName(req), tree, lo.ToPtr(time.Minute*30))
	if err != nil {
		return nil, err
	}

	return tree, nil
}

func (i ITreeServiceImpl) Tabs(ctx context.Context, req *dto.ObjectTabsRequest) ([]contract.FormTab, error) {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(ctx, connection, i.cm)
	if err != nil {
		return nil, err
	}

	return repo.GetFormTabs(ctx, contract.TreeNodeActionName(req.Action)), nil
}

func (i ITreeServiceImpl) ObjectDetail(ctx context.Context, req *dto.ObjectDetailRequest) (*contract.FormResponse, error) {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(ctx, connection, i.cm)
	if err != nil {
		return nil, err
	}

	data, err := repo.Objects(ctx, req.NodeID, contract.TreeTab(req.TabID), contract.TreeNodeActionName(req.Action))
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}
	return data, nil
}

func (i ITreeServiceImpl) ObjectExecute(ctx context.Context, req *dto.ObjectExecuteRequest) error {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(ctx, connection, i.cm)
	if err != nil {
		return err
	}

	err = repo.Execute(ctx, req.NodeID, contract.TreeNodeActionName(req.Action), req.Params)
	if err != nil {
		return apperror.InternalServerError(err)
	}
	return nil
}

func (i ITreeServiceImpl) ObjectPreviewExecute(ctx context.Context, req *dto.ObjectExecuteRequest) ([]string, error) {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(ctx, connection, i.cm)
	if err != nil {
		return nil, err
	}

	queries, err := repo.PreviewExecute(ctx, req.NodeID, contract.TreeNodeActionName(req.Action), req.Params)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}
	return queries, nil
}

func (i ITreeServiceImpl) GetDynamicFieldOptions(ctx context.Context, req *dto.DynamicFieldOptionsRequest) ([]contract.FormFieldOption, error) {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(ctx, connection, i.cm)
	if err != nil {
		return nil, err
	}

	dynamicReq := &contract.DynamicFieldRequest{
		NodeID:     req.NodeID,
		Parameters: req.Parameters,
	}

	options, err := repo.GetDynamicFieldOptions(ctx, dynamicReq)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return options, nil
}

func (i ITreeServiceImpl) cacheName(req *dto.TreeListRequest) string {
	return fmt.Sprintf("c:%d:tree:%s", req.ConnectionID, req.ParentID)
}
