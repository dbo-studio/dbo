package serviceDesign

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/driver"
	pgsql "github.com/dbo-studio/dbo/internal/driver/pgsql"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

type IDesignService interface {
	IndexList(ctx context.Context, dto *dto.GetDesignIndexRequest) (*dto.GetDesignIndexResponse, error)
	ColumnList(ctx context.Context, dto *dto.GetDesignColumnRequest, editable bool) (*dto.GetDesignColumnResponse, error)
	ColumnsFormater(ctx context.Context, dto []pgsql.Structure) []dto.GetDesignColumn
	UpdateDesign(ctx context.Context, dto *dto.UpdateDesignRequest) (*dto.UpdateDesignResponse, error)
}

var _ IDesignService = (*IDesignServiceImpl)(nil)

type IDesignServiceImpl struct {
	connectionRepo repository.IConnectionRepo
	drivers        *driver.DriverEngine
}

func NewDesignService(cr repository.IConnectionRepo, drivers *driver.DriverEngine) *IDesignServiceImpl {
	return &IDesignServiceImpl{
		connectionRepo: cr,
		drivers:        drivers,
	}
}

func (i IDesignServiceImpl) IndexList(ctx context.Context, dto *dto.GetDesignIndexRequest) (*dto.GetDesignIndexResponse, error) {
	_, err := i.connectionRepo.Find(ctx, dto.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	indexes, err := i.drivers.Pgsql.Indexes(dto.ConnectionId, dto.Table, dto.Schema)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	return indexListToResponse(indexes), nil
}

func (i IDesignServiceImpl) ColumnList(ctx context.Context, req *dto.GetDesignColumnRequest, editable bool) (*dto.GetDesignColumnResponse, error) {
	_, err := i.connectionRepo.Find(ctx, req.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	structures, err := i.drivers.Pgsql.TableStructure(req.ConnectionId, req.Table, req.Schema, editable)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	return &dto.GetDesignColumnResponse{
		Columns: i.ColumnsFormater(ctx, structures),
	}, nil
}

func (i IDesignServiceImpl) ColumnsFormater(_ context.Context, structures []pgsql.Structure) []dto.GetDesignColumn {
	return columnListToResponse(structures)
}

func (i IDesignServiceImpl) UpdateDesign(ctx context.Context, dto *dto.UpdateDesignRequest) (*dto.UpdateDesignResponse, error) {
	_, err := i.connectionRepo.Find(ctx, dto.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	updateDesignResult, err := i.drivers.Pgsql.UpdateDesign(dto)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	return updateDesignToResponse(updateDesignResult), nil
}
