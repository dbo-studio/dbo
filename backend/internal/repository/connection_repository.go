package repository

import (
	"context"
	"database/sql"

	"github.com/dbo-studio/dbo/api/dto"
	"github.com/dbo-studio/dbo/app"
	"github.com/dbo-studio/dbo/model"
)

var _ IConnectionRepo = (*IConnectionRepoImpl)(nil)

type IConnectionRepoImpl struct {
}

func NewConnectionRepo() *IConnectionRepoImpl {
	return &IConnectionRepoImpl{}
}

func (c *IConnectionRepoImpl) FindConnection(ctx context.Context, id int32) (*model.Connection, error) {
	var connection model.Connection
	result := app.DB().Where("id", "=", id).First(&connection)

	return &connection, result.Error
}

func (c *IConnectionRepoImpl) CreateConnection(ctx context.Context, dto *dto.CreateConnectionRequest) (*model.Connection, error) {
	connection := &model.Connection{
		Name:     dto.Name,
		Host:     dto.Host,
		Username: dto.Username,
		Password: sql.NullString{
			Valid:  true,
			String: dto.Password,
		},
		Port:     uint(dto.Port),
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

	result := app.DB().Save(connection)

	return connection, result.Error
}
