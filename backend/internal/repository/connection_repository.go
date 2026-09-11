package repository

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

type IConnectionRepoImpl struct {
	db *gorm.DB
}

func NewConnectionRepo(db *gorm.DB) IConnectionRepo {
	return &IConnectionRepoImpl{
		db: db,
	}
}

func (c IConnectionRepoImpl) Index(ctx context.Context) (*[]model.Connection, error) {
	var connections []model.Connection

	ownerID := helper.CtxOwnerID(ctx)
	result := c.db.WithContext(ctx).
		Where("owner_id = ? OR id IN (SELECT connection_id FROM connection_shares WHERE user_id = ?)", ownerID, ownerID).
		Order("id ASC").
		Find(&connections)

	return &connections, result.Error
}

func (c IConnectionRepoImpl) Find(ctx context.Context, id int32) (*model.Connection, error) {
	connection, err := c.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if connectionAccessible(ctx, c.db, connection) {
		return connection, nil
	}

	return nil, gorm.ErrRecordNotFound
}

func (c IConnectionRepoImpl) FindByID(ctx context.Context, id int32) (*model.Connection, error) {
	var connection model.Connection

	result := c.db.WithContext(ctx).Where("id = ?", id).First(&connection)

	return &connection, result.Error
}

func connectionAccessible(ctx context.Context, db *gorm.DB, connection *model.Connection) bool {
	ownerID := helper.CtxOwnerID(ctx)
	if connection.OwnerID == ownerID {
		return true
	}

	var n int64

	err := db.WithContext(ctx).Model(&model.ConnectionShare{}).
		Where("connection_id = ? AND user_id = ?", connection.ID, ownerID).
		Count(&n).Error

	return err == nil && n > 0
}

func (c IConnectionRepoImpl) FindByIDAndOwner(ctx context.Context, id int32, ownerID string) (*model.Connection, error) {
	var connection model.Connection

	result := c.db.WithContext(ctx).Where("id = ? AND owner_id = ?", id, ownerID).First(&connection)

	return &connection, result.Error
}

func (c IConnectionRepoImpl) Create(ctx context.Context, dto *dto.CreateConnectionRequest) (*model.Connection, error) {
	connection := &model.Connection{
		OwnerID:        helper.CtxOwnerID(ctx),
		Name:           dto.Name,
		ConnectionType: dto.Type,
		Options:        string(dto.Options),
		IsActive:       true,
		SafeMode:       model.SafeMode(lo.FromPtr(dto.SafeMode)),
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
	if req.SafeMode != nil {
		connection.SafeMode = model.SafeMode(*req.SafeMode)
	}

	result := c.db.WithContext(ctx).Save(&connection)

	return connection, result.Error
}

func (c IConnectionRepoImpl) MakeAllConnectionsNotDefault(ctx context.Context, exceptedConnection *model.Connection) error {
	ownerID := helper.CtxOwnerID(ctx)
	query := c.db.WithContext(ctx).Model(&model.Connection{}).Where("owner_id = ?", ownerID)

	if exceptedConnection != nil {
		query = query.Not("id", exceptedConnection.ID)
	}

	return query.Update("is_active", false).Error
}

func (c IConnectionRepoImpl) UpdateVersion(ctx context.Context, connection *model.Connection, version string) (*model.Connection, error) {
	connection.Version = lo.ToPtr(version)

	result := c.db.WithContext(ctx).Save(&connection)

	return connection, result.Error
}
