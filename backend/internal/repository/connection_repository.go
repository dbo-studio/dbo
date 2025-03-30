package repository

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/helper"
	"gorm.io/gorm"
)

var _ IConnectionRepo = (*IConnectionRepoImpl)(nil)

type IConnectionRepoImpl struct {
	db *gorm.DB
}

func NewConnectionRepo(db *gorm.DB) *IConnectionRepoImpl {
	return &IConnectionRepoImpl{
		db: db,
	}
}

func (c IConnectionRepoImpl) Index(_ context.Context) (*[]model.Connection, error) {
	var connections []model.Connection
	result := c.db.Find(&connections)

	return &connections, result.Error
}

func (c IConnectionRepoImpl) Find(_ context.Context, id int32) (*model.Connection, error) {
	var connection model.Connection
	result := c.db.Where("id", "=", id).First(&connection)

	return &connection, result.Error
}

func (c IConnectionRepoImpl) Create(ctx context.Context, dto *dto.CreateConnectionRequest) (*model.Connection, error) {
	connection := &model.Connection{
		Name:           dto.Name,
		ConnectionType: dto.Type,
		Options:        string(dto.Options),
		IsActive:       false,
		CreatedAt:      nil,
		UpdatedAt:      nil,
	}

	result := c.db.WithContext(ctx).Save(connection)
	return connection, result.Error
}

func (c IConnectionRepoImpl) Delete(ctx context.Context, connection *model.Connection) error {
	result := c.db.WithContext(ctx).Delete(connection)
	return result.Error
}

func (c IConnectionRepoImpl) Update(ctx context.Context, connection *model.Connection, req *dto.UpdateConnectionRequest) (*model.Connection, error) {
	connection.Name = helper.OptionalString(req.Name, connection.Name)
	connection.IsActive = helper.OptionalBool(req.IsActive, connection.IsActive)
	connection.Options = string(req.Options)

	result := c.db.WithContext(ctx).Save(&connection)

	return connection, result.Error
}

func (c IConnectionRepoImpl) MakeAllConnectionsNotDefault(ctx context.Context, connection *model.Connection, req *dto.UpdateConnectionRequest) error {
	if req.IsActive != nil && *req.IsActive {
		result := c.db.WithContext(ctx).Model(&model.Connection{}).Not("id", connection.ID).Update("is_active", false)
		return result.Error
	}
	return nil
}
