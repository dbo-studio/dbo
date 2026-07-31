package serviceTree

import (
	"context"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/container"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceSafemode "github.com/dbo-studio/dbo/internal/service/safemode"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/sqlguard"
	"github.com/samber/lo"
)

type ITreeService interface {
	Tree(ctx context.Context, req *dto.TreeListRequest) (*contract.TreeNode, error)
	Tabs(ctx context.Context, req *dto.ObjectTabsRequest) ([]contract.FormTab, error)
	ObjectDetail(ctx context.Context, req *dto.ObjectDetailRequest) (*contract.FormResponse, error)
	GetDynamicFieldOptions(ctx context.Context, req *dto.DynamicFieldOptionsRequest) ([]contract.FormFieldOption, error)
	ObjectExecute(ctx context.Context, req *dto.ObjectExecuteRequest) (*contract.ExecuteResult, error)
	ObjectPreviewExecute(ctx context.Context, req *dto.ObjectExecuteRequest) ([]string, error)
}

var _ ITreeService = (*ITreeServiceImpl)(nil)

type ITreeServiceImpl struct {
	connectionRepo repository.IConnectionRepo
	cm             *databaseConnection.ConnectionManager
	cache          cache.Cache
	unlockStore    *serviceSafemode.UnlockStore
}

func NewTreeService(cr repository.IConnectionRepo, cm *databaseConnection.ConnectionManager) *ITreeServiceImpl {
	c := container.Instance().Cache()
	return &ITreeServiceImpl{
		connectionRepo: cr,
		cm:             cm,
		cache:          c,
		unlockStore:    serviceSafemode.NewUnlockStore(c),
	}
}

func (i ITreeServiceImpl) Tree(ctx context.Context, req *dto.TreeListRequest) (*contract.TreeNode, error) {
	if lo.FromPtr(req.FromCache) {
		var tree *contract.TreeNode
		err := i.cache.Get(ctx, cache.TreeKey(uint(req.ConnectionID), req.ParentID), &tree)
		if err == nil && tree != nil {
			return tree, nil
		}
	}

	connection, err := i.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	err = i.cache.DeleteByPrefix(ctx, cache.ConnectionPrefix(connection.ID))
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

	err = i.cache.Set(ctx, cache.TreeKey(uint(req.ConnectionID), req.ParentID), tree, lo.ToPtr(time.Minute*30))
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

func (i ITreeServiceImpl) ObjectExecute(ctx context.Context, req *dto.ObjectExecuteRequest) (*contract.ExecuteResult, error) {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	policy := serviceSafemode.FromConnection(connection)
	policy = i.unlockStore.WithUnlock(ctx, helper.CtxOwnerID(ctx), connection.ID, policy)
	class := sqlguard.ClassifyAction(req.Action)
	if err := serviceSafemode.Enforce(policy, class, req.Confirmed); err != nil {
		return nil, err
	}

	repo, err := database.NewDatabaseRepository(ctx, connection, i.cm)
	if err != nil {
		return nil, err
	}

	result, err := repo.Execute(ctx, req.NodeID, contract.TreeNodeActionName(req.Action), req.Params)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	if err := i.cache.DeleteByPrefix(ctx, cache.ConnectionPrefix(uint(req.ConnectionID))); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	if result == nil {
		result = &contract.ExecuteResult{}
	}

	return result, nil
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
