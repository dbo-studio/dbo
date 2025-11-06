package serviceSchemaDiagram

import (
	"context"
	"encoding/json"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

type ISchemaDiagramService interface {
	GetDiagram(ctx context.Context, req *dto.SchemaDiagramRequest) (*dto.SchemaDiagramResponse, error)
	SaveLayout(ctx context.Context, req *dto.SaveLayoutRequest) error
	CreateRelationship(ctx context.Context, req *dto.SaveRelationshipRequest) error
	DeleteRelationship(ctx context.Context, req *dto.DeleteRelationshipRequest) error
}

type ISchemaDiagramServiceImpl struct {
	connectionRepo    repository.IConnectionRepo
	schemaDiagramRepo repository.ISchemaDiagramRepo
	cm                *databaseConnection.ConnectionManager
}

func NewSchemaDiagramService(
	connectionRepo repository.IConnectionRepo,
	schemaDiagramRepo repository.ISchemaDiagramRepo,
	cm *databaseConnection.ConnectionManager,
) *ISchemaDiagramServiceImpl {
	return &ISchemaDiagramServiceImpl{
		connectionRepo:    connectionRepo,
		schemaDiagramRepo: schemaDiagramRepo,
		cm:                cm,
	}
}

func (s *ISchemaDiagramServiceImpl) GetDiagram(ctx context.Context, req *dto.SchemaDiagramRequest) (*dto.SchemaDiagramResponse, error) {
	connection, err := s.connectionRepo.Find(ctx, req.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(connection, s.cm)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	diagram, err := repo.SchemaDiagram(req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	// Load saved layout if exists
	schema := lo.FromPtr(req.Schema)
	if schema == "" {
		schema = "public"
	}

	savedLayout, err := s.schemaDiagramRepo.Find(ctx, uint(req.ConnectionId), schema)
	if err == nil && savedLayout != nil {
		var layout dto.DiagramLayout
		if err := json.Unmarshal([]byte(savedLayout.Layout), &layout); err == nil {
			diagram.Layout = &layout
		}
	}

	return diagram, nil
}

func (s *ISchemaDiagramServiceImpl) SaveLayout(ctx context.Context, req *dto.SaveLayoutRequest) error {
	return s.schemaDiagramRepo.CreateOrUpdate(ctx, uint(req.ConnectionId), req.Schema, &req.Layout)
}

func (s *ISchemaDiagramServiceImpl) CreateRelationship(ctx context.Context, req *dto.SaveRelationshipRequest) error {
	connection, err := s.connectionRepo.Find(ctx, req.ConnectionId)
	if err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(connection, s.cm)
	if err != nil {
		return apperror.InternalServerError(err)
	}

	return repo.CreateRelationship(req)
}

func (s *ISchemaDiagramServiceImpl) DeleteRelationship(ctx context.Context, req *dto.DeleteRelationshipRequest) error {
	connection, err := s.connectionRepo.Find(ctx, req.ConnectionId)
	if err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(connection, s.cm)
	if err != nil {
		return apperror.InternalServerError(err)
	}

	return repo.DeleteRelationship(req)
}
