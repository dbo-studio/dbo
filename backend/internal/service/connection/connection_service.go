package serviceConnection

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/driver"
	"github.com/dbo-studio/dbo/internal/repository"
)

type IConnectionService interface {
	Index(ctx context.Context) (*dto.ConnectionsResponse, error)
	Create(ctx context.Context, req *dto.CreateConnectionRequest) (*dto.ConnectionDetailResponse, error)
	Detail(ctx context.Context, req *dto.ConnectionDetailRequest) (*dto.ConnectionDetailResponse, error)
	Update(ctx context.Context, connectionId int32, req *dto.UpdateConnectionRequest) (*dto.ConnectionDetailResponse, error)
	Delete(ctx context.Context, connectionId int32) (*dto.ConnectionsResponse, error)
	Test(ctx context.Context, req *dto.CreateConnectionRequest) error
}

var _ IConnectionService = (*IConnectionServiceImpl)(nil)

type IConnectionServiceImpl struct {
	drivers        *driver.DriverEngine
	connectionRepo repository.IConnectionRepo
	cacheRepo      repository.ICacheRepo
}

func NewConnectionService(
	drivers *driver.DriverEngine,
	connectionRepo repository.IConnectionRepo,
	cacheRepo repository.ICacheRepo,
) *IConnectionServiceImpl {
	return &IConnectionServiceImpl{
		drivers:        drivers,
		connectionRepo: connectionRepo,
		cacheRepo:      cacheRepo,
	}
}

func (s IConnectionServiceImpl) Index(ctx context.Context) (*dto.ConnectionsResponse, error) {
	connections, err := s.connectionRepo.Index(ctx)
	if err != nil {
		return nil, err
	}

	return connectionsToResponse(connections), nil
}

func (s IConnectionServiceImpl) Test(_ context.Context, req *dto.CreateConnectionRequest) error {
	//_, err := s.drivers.Pgsql.ConnectWithOptions(pgsqlDriver.ConnectionOption{
	//	Host:     req.Host,
	//	Port:     req.Port,
	//	User:     req.Username,
	//	Password: req.Password,
	//	Database: req.Database,
	//})

	return nil
}
