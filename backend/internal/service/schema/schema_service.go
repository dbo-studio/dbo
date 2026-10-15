package serviceSchema

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceSafemode "github.com/dbo-studio/dbo/internal/service/safemode"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cache"
)

type ISchemaService interface {
	Diagram(ctx context.Context, req *dto.DiagramRequest) (*contract.DiagramGraph, error)
	PreviewChange(ctx context.Context, req *dto.SchemaChangeRequest) ([]string, error)
	ApplyChange(ctx context.Context, req *dto.SchemaChangeRequest) error
}

var _ ISchemaService = (*ISchemaServiceImpl)(nil)

type ISchemaServiceImpl struct {
	connectionRepo repository.IConnectionRepo
	cm             *databaseConnection.ConnectionManager
	cache          cache.Cache
	unlockStore    *serviceSafemode.UnlockStore
}

func NewSchemaService(cr repository.IConnectionRepo, cm *databaseConnection.ConnectionManager, appCache cache.Cache) ISchemaService {
	return &ISchemaServiceImpl{
		connectionRepo: cr,
		cm:             cm,
		cache:          appCache,
		unlockStore:    serviceSafemode.NewUnlockStore(appCache),
	}
}

func (s *ISchemaServiceImpl) Diagram(ctx context.Context, req *dto.DiagramRequest) (*contract.DiagramGraph, error) {
	connection, err := s.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(ctx, connection, s.cm)
	if err != nil {
		return nil, err
	}

	graph, err := repo.Diagram(ctx, contract.DiagramOptions{
		Database: req.Database,
		Schema:   req.Schema,
		Tables:   req.TableNames(),
	})
	if err != nil {
		return nil, err
	}

	if graph == nil {
		graph = &contract.DiagramGraph{}
	}

	if graph.Nodes == nil {
		graph.Nodes = []contract.DiagramNode{}
	}

	if graph.Edges == nil {
		graph.Edges = []contract.DiagramEdge{}
	}

	return graph, nil
}
