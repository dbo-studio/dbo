package repository

import (
	"context"
	"encoding/json"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

type ISchemaDiagramRepoImpl struct {
	db *gorm.DB
}

func NewSchemaDiagramRepo(db *gorm.DB) ISchemaDiagramRepo {
	return &ISchemaDiagramRepoImpl{
		db: db,
	}
}

func (r *ISchemaDiagramRepoImpl) Find(ctx context.Context, connectionID uint, schema string) (*model.SchemaDiagram, error) {
	var diagram model.SchemaDiagram
	result := r.db.WithContext(ctx).
		Where("connection_id = ? AND schema = ?", connectionID, schema).
		First(&diagram)

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, result.Error
	}

	return &diagram, nil
}

func (r *ISchemaDiagramRepoImpl) CreateOrUpdate(ctx context.Context, connectionID uint, schema string, layout *dto.DiagramLayout) error {
	layoutJSON, err := json.Marshal(layout)
	if err != nil {
		return err
	}

	var diagram model.SchemaDiagram
	result := r.db.WithContext(ctx).
		Where("connection_id = ? AND schema = ?", connectionID, schema).
		First(&diagram)

	if result.Error == gorm.ErrRecordNotFound {
		// Create new
		diagram = model.SchemaDiagram{
			ConnectionID: connectionID,
			Schema:       schema,
			Layout:       string(layoutJSON),
		}
		return r.db.WithContext(ctx).Create(&diagram).Error
	} else if result.Error != nil {
		return result.Error
	}

	// Update existing
	diagram.Layout = string(layoutJSON)
	return r.db.WithContext(ctx).Save(&diagram).Error
}
