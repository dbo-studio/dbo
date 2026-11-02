package serviceSchema

import (
	"context"
	"fmt"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceSafemode "github.com/dbo-studio/dbo/internal/service/safemode"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/sqlguard"
	"github.com/samber/lo"
)

type ISchemaService interface {
	Diagram(ctx context.Context, req *dto.DiagramRequest) (*contract.DiagramGraph, error)
	// TableStructures reads the live definition of each table that exists.
	TableStructures(ctx context.Context, req *dto.SchemaChangeRequest) (map[string]*contract.TableStructure, error)
	// PreviewWrite counts the rows an INSERT, UPDATE or DELETE would change and reads a few, without changing anything.
	PreviewWrite(ctx context.Context, req *dto.WritePreviewRequest) (*dto.WritePreviewResponse, error)
	// PreviewWrites previews several data changes as one batch: each sees what the ones before it did.
	PreviewWrites(ctx context.Context, req *dto.WritePreviewRequest, sqls []string) ([]*dto.WritePreviewResponse, error)
	PreviewChange(ctx context.Context, req *dto.SchemaChangeRequest) ([]string, error)
	ApplyChange(ctx context.Context, req *dto.SchemaChangeRequest) (*ChangeResult, error)
	// CaptureWrite reads what a data change touches before it runs; WriteUndo then builds its undo.
	CaptureWrite(ctx context.Context, req *dto.WritePreviewRequest) *WriteCapture
	WriteUndo(ctx context.Context, req *dto.WritePreviewRequest, capture *WriteCapture) (string, string)
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

// sampleRows is how many of the touched rows a write preview shows.
const sampleRows = 5

// PreviewWrite counts the rows a data change would touch, without changing
// anything, and reads a few of them when the statement allows it.
func (s *ISchemaServiceImpl) PreviewWrite(ctx context.Context, req *dto.WritePreviewRequest) (*dto.WritePreviewResponse, error) {
	previews, err := s.PreviewWrites(ctx, req, []string{req.SQL})
	if err != nil {
		return nil, err
	}

	return previews[0], nil
}

// PreviewWrites counts the rows of several data changes run in order, as one
// batch that is rolled back, and samples the rows each would touch now.
func (s *ISchemaServiceImpl) PreviewWrites(ctx context.Context, req *dto.WritePreviewRequest, sqls []string) ([]*dto.WritePreviewResponse, error) {
	statements := make([]string, len(sqls))

	for i, sql := range sqls {
		statement, err := sqlguard.WriteStatement(sql)
		if err != nil {
			return nil, apperror.BadRequest(lo.Ternary(len(sqls) > 1, fmt.Errorf("statement %d: %w", i+1, err), err))
		}

		statements[i] = statement
	}

	connection, err := s.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(ctx, connection, s.cm)
	if err != nil {
		return nil, err
	}

	affected, err := repo.PreviewWrite(ctx, statements, req.Database, req.Schema)
	if err != nil {
		return nil, err
	}

	responses := make([]*dto.WritePreviewResponse, len(statements))

	for i, statement := range statements {
		response := &dto.WritePreviewResponse{SQL: statement, AffectedRows: affected[i], Columns: []string{}, Rows: []map[string]any{}}

		if query, ok := sqlguard.SampleQuery(statement, sampleRows); ok {
			// The sample is a courtesy: when it cannot be read the count still stands.
			if sample, err := repo.RunRawQuery(ctx, &contract.RawQueryRequest{ConnectionID: req.ConnectionID, Query: query, Database: req.Database, Schema: req.Schema}); err == nil && sample != nil {
				response.Rows = sample.Data
				response.SampleQuery = query
				response.Columns = lo.Map(sample.Columns, func(column contract.Column, _ int) string { return column.Name })
			}
		}

		responses[i] = response
	}

	return responses, nil
}
