package contract

import (
	"context"
	"github.com/dbo-studio/dbo/internal/app/dto"
	pgsql "github.com/dbo-studio/dbo/internal/driver/pgsql/engine"
)

type ISavedQueryService interface {
	Index(ctx context.Context, dto *dto.SavedQueryListRequest) (*dto.SavedQueryListResponse, error)
	Create(ctx context.Context, dto *dto.CreateSavedQueryRequest) (*dto.CreateSavedQueryResponse, error)
	Update(ctx context.Context, queryId int32, req *dto.UpdateSavedQueryRequest) (*dto.UpdateSavedQueryResponse, error)
	Delete(ctx context.Context, queryId int32) (*dto.SavedQueryListResponse, error)
}

type IHistoryService interface {
	Index(ctx context.Context, dto *dto.HistoryListRequest) (*dto.HistoryListResponse, error)
}

type IDesignService interface {
	IndexList(ctx context.Context, dto *dto.GetDesignIndexRequest) (*dto.GetDesignIndexResponse, error)
	ColumnList(ctx context.Context, dto *dto.GetDesignColumnRequest, editable bool) (*dto.GetDesignColumnResponse, error)
	ColumnsFormater(ctx context.Context, dto []pgsql.Structure) []dto.GetDesignColumn
	UpdateDesign(ctx context.Context, dto *dto.UpdateDesignRequest) (*dto.UpdateDesignResponse, error)
}

type IDatabaseService interface {
	CreateDatabase(context.Context, *dto.CreateDatabaseRequest) error
	DeleteDatabase(context.Context, *dto.DeleteDatabaseRequest) error
	MetaData(ctx context.Context, connId int32) (*dto.DatabaseMetaDataResponse, error)
}

type IConnectionService interface {
	Index(ctx context.Context) (*dto.ConnectionsResponse, error)
	Create(ctx context.Context, req *dto.CreateConnectionRequest) (*dto.ConnectionDetailResponse, error)
	Detail(ctx context.Context, req *dto.ConnectionDetailRequest) (*dto.ConnectionDetailResponse, error)
	Update(ctx context.Context, connectionId int32, req *dto.UpdateConnectionRequest) (*dto.ConnectionDetailResponse, error)
	Delete(ctx context.Context, connectionId int32) (*dto.ConnectionsResponse, error)
	Test(ctx context.Context, req *dto.CreateConnectionRequest) error
}
