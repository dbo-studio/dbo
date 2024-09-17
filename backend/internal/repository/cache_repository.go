package repository

import (
	"context"
	"fmt"

	"github.com/dbo-studio/dbo/app"
	"github.com/dbo-studio/dbo/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

var _ ICacheRepo = (*ICacheRepoImpl)(nil)

type ICacheRepoImpl struct {
}

func NewCacheRepo() *ICacheRepoImpl {
	return &ICacheRepoImpl{}
}

// GeDatabaseTables implements ICacheRepo.
func (i *ICacheRepoImpl) GeDatabaseTables(ctx context.Context, connectionID uint, schemaName string, fromCache bool) ([]string, error) {
	var tables []string
	err := app.Cache().ConditionalGet(
		fmt.Sprintf("connections:%d:tables", connectionID),
		&tables,
		fromCache,
	)

	if err != nil || tables == nil {
		tables, err = app.Drivers().Pgsql.Tables(int32(connectionID), schemaName)

		if err != nil {
			return tables, apperror.DriverError(err)
		}

		err = app.Cache().Set(fmt.Sprintf("connections:%d:tables", connectionID), tables, nil)
		if err != nil {
			return tables, apperror.InternalServerError(err)
		}
	}

	return tables, err
}

// GetConnectionDatabases implements ICacheRepo.
func (i *ICacheRepoImpl) GetConnectionDatabases(ctx context.Context, connectionID uint, fromCache bool) ([]string, error) {
	var databases []string
	err := app.Cache().ConditionalGet(
		fmt.Sprintf("connections:%d:databases", connectionID),
		&databases,
		fromCache,
	)

	if err != nil || databases == nil {
		databases, err = app.Drivers().Pgsql.Databases(int32(connectionID), false)

		if err != nil {
			return databases, apperror.DriverError(err)
		}

		err = app.Cache().Set(fmt.Sprintf("connections:%d:databases", connectionID), databases, nil)
		if err != nil {
			return databases, apperror.InternalServerError(err)
		}
	}

	return databases, err
}

// GetConnectionSchemas implements ICacheRepo.
func (i *ICacheRepoImpl) GetConnectionSchemas(ctx context.Context, connectionID uint, databaseName string, fromCache bool) ([]string, error) {
	var schemas []string
	err := app.Cache().ConditionalGet(
		fmt.Sprintf("connections:%d:schemas", connectionID),
		&schemas,
		fromCache,
	)

	if err != nil || schemas == nil {
		schemas, err = app.Drivers().Pgsql.Schemas(int32(connectionID), databaseName, false)

		if err != nil {
			return schemas, apperror.DriverError(err)
		}

		err = app.Cache().Set(fmt.Sprintf("connections:%d:schemas", connectionID), schemas, nil)
		if err != nil {
			return schemas, apperror.InternalServerError(err)
		}
	}

	return schemas, err
}

// GetDatabaseVersion implements ICacheRepo.
func (i *ICacheRepoImpl) GetDatabaseVersion(ctx context.Context, connectionID uint, fromCache bool) (string, error) {
	var version string
	err := app.Cache().ConditionalGet(
		fmt.Sprintf("connections:%d:version", connectionID),
		&version,
		fromCache,
	)

	if err != nil || version == "" {
		version, err = app.Drivers().Pgsql.Version(int32(connectionID))

		if err != nil {
			return version, apperror.DriverError(err)
		}

		err = app.Cache().Set(fmt.Sprintf("connections:%d:version", connectionID), version, nil)
		if err != nil {
			return version, apperror.InternalServerError(err)
		}
	}

	return version, err
}

// FlushCache implements ICacheRepo.
func (i *ICacheRepoImpl) FlushCache(ctx context.Context) error {
	return app.DB().Delete(&model.CacheItem{}).Error
}
