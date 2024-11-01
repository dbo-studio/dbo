package repository

import (
	"context"
	"database/sql"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/driver"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/helper"
	"gorm.io/gorm"
)

var _ IConnectionRepo = (*IConnectionRepoImpl)(nil)

type IConnectionRepoImpl struct {
	db      *gorm.DB
	drivers *driver.DriverEngine
}

func NewConnectionRepo(db *gorm.DB, drivers *driver.DriverEngine) *IConnectionRepoImpl {
	return &IConnectionRepoImpl{
		db:      db,
		drivers: drivers,
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

func (c IConnectionRepoImpl) Create(_ context.Context, dto *dto.CreateConnectionRequest) (*model.Connection, error) {
	connection := &model.Connection{
		Name:     dto.Name,
		Host:     dto.Host,
		Username: dto.Username,
		Password: sql.NullString{
			Valid:  true,
			String: dto.Password,
		},
		Port:     dto.Port,
		Database: dto.Database,
		IsActive: false,
		CurrentSchema: sql.NullString{
			String: dto.Database,
			Valid:  true,
		},
		CurrentDatabase: sql.NullString{},
		CreatedAt:       sql.NullTime{},
		UpdatedAt:       sql.NullTime{},
	}

	result := c.db.Save(connection)

	return connection, result.Error
}

func (c IConnectionRepoImpl) Delete(_ context.Context, connection *model.Connection) error {
	result := c.db.Delete(connection)
	return result.Error
}

func (c IConnectionRepoImpl) Update(_ context.Context, connection *model.Connection, req *dto.UpdateConnectionRequest) (*model.Connection, error) {
	connection.Name = helper.OptionalString(req.Name, connection.Name)
	connection.Host = helper.OptionalString(req.Host, connection.Host)
	connection.Username = helper.OptionalString(req.Username, connection.Username)
	connection.Password = sql.NullString{
		Valid:  true,
		String: helper.OptionalString(req.Password, connection.Password.String),
	}
	connection.Port = helper.OptionalInt32(req.Port, connection.Port)
	connection.Database = helper.OptionalString(req.Database, connection.Database)
	connection.IsActive = helper.OptionalBool(req.IsActive, connection.IsActive)
	connection.CurrentDatabase = sql.NullString{
		Valid:  true,
		String: helper.OptionalString(req.CurrentDatabase, connection.CurrentDatabase.String),
	}

	if req.CurrentDatabase != nil && req.CurrentSchema == nil {
		schemas, _ := c.drivers.Pgsql.Schemas(int32(connection.ID), *req.CurrentDatabase, false)
		var currentSchema string
		if len(schemas) > 0 {
			currentSchema = schemas[0]
		}
		connection.CurrentSchema = sql.NullString{
			Valid:  true,
			String: currentSchema,
		}
	} else {
		connection.CurrentSchema = sql.NullString{
			Valid:  true,
			String: helper.OptionalString(req.CurrentSchema, connection.CurrentSchema.String),
		}
	}

	result := c.db.Save(&connection)

	return connection, result.Error
}

func (c IConnectionRepoImpl) MakeAllConnectionsNotDefault(_ context.Context, connection *model.Connection, req *dto.UpdateConnectionRequest) error {
	if req.IsActive != nil && *req.IsActive {
		result := c.db.Model(&model.Connection{}).Not("id", connection.ID).Update("is_active", false)
		return result.Error
	}
	return nil
}
