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
	"github.com/samber/lo"
)

type ISchemaService interface {
	Diagram(ctx context.Context, req *dto.DiagramRequest) (*contract.DiagramGraph, error)
	// TableStructures reads the live definition of each table that exists.
	TableStructures(ctx context.Context, req *dto.SchemaChangeRequest) (map[string]*contract.TableStructure, error)
	PreviewChange(ctx context.Context, req *dto.SchemaChangeRequest) ([]string, error)
	ApplyChange(ctx context.Context, req *dto.SchemaChangeRequest) (*ChangeResult, error)
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

func (s *ISchemaServiceImpl) TableStructures(ctx context.Context, req *dto.SchemaChangeRequest) (map[string]*contract.TableStructure, error) {
	connection, err := s.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(ctx, connection, s.cm)
	if err != nil {
		return nil, err
	}

	structures := map[string]*contract.TableStructure{}

	for _, table := range lo.Compact(lo.Uniq(lo.Map(req.Ops, func(op dto.SchemaChangeOp, _ int) string { return op.Table }))) {
		// A table that cannot be read (not created yet, or dropped) has no "before".
		if structure, err := repo.TableStructure(ctx, table, req.Database, req.Schema); err == nil && len(structure.Columns) > 0 {
			structures[table] = structure
		}
	}

	return structures, nil
}
