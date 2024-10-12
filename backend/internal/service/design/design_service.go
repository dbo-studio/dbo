package serviceDesign

import (
	"context"
	"github.com/dbo-studio/dbo/api/dto"
	"github.com/dbo-studio/dbo/app"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

type IDesignService interface {
	IndexList(_ context.Context, dto *dto.GetDesignIndexRequest) (*dto.GetDesignIndexResponse, error)
	ColumnList(_ context.Context, dto *dto.GetDesignColumnRequest) (*dto.GetDesignColumnResponse, error)
	UpdateDesign(_ context.Context, dto *dto.UpdateDesignRequest) (*dto.UpdateDesignResponse, error)
}

var _ IDesignService = (*IDesignServiceImpl)(nil)

type IDesignServiceImpl struct {
	connectionRepo repository.IConnectionRepo
}

func NewDesignService(cr repository.IConnectionRepo) *IDesignServiceImpl {
	return &IDesignServiceImpl{
		connectionRepo: cr,
	}
}

func (i IDesignServiceImpl) IndexList(_ context.Context, dto *dto.GetDesignIndexRequest) (*dto.GetDesignIndexResponse, error) {
	indexes, err := app.Drivers().Pgsql.Indexes(dto.ConnectionId, dto.Table, dto.Schema)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	return indexListToResponse(indexes), nil
}

func (i IDesignServiceImpl) ColumnList(_ context.Context, dto *dto.GetDesignColumnRequest) (*dto.GetDesignColumnResponse, error) {
	structures, err := app.Drivers().Pgsql.TableStructure(dto.ConnectionId, dto.Table, dto.Schema, false)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	return columnListToResponse(structures), nil
}

func (i IDesignServiceImpl) UpdateDesign(_ context.Context, dto *dto.UpdateDesignRequest) (*dto.UpdateDesignResponse, error) {
	updateDesignResult, err := app.Drivers().Pgsql.UpdateDesign(dto)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	return updateDesignToResponse(updateDesignResult), nil
}
