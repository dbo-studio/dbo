package repository

import (
	"context"
	"fmt"
	"github.com/dbo-studio/dbo/internal/driver"
	"github.com/dbo-studio/dbo/pkg/cache"
	"gorm.io/gorm"

	"github.com/dbo-studio/dbo/pkg/apperror"
)

var _ ICacheRepo = (*ICacheRepoImpl)(nil)

type ICacheRepoImpl struct {
	cache   cache.Cache
	drivers *driver.DriverEngine
	db      *gorm.DB
}

func NewCacheRepo(cache cache.Cache, drivers *driver.DriverEngine) *ICacheRepoImpl {
	return &ICacheRepoImpl{
		cache:   cache,
		drivers: drivers,
	}
}

// GeDatabaseTables implements ICacheRepo.
func (i ICacheRepoImpl) GeDatabaseTables(_ context.Context, connectionID uint, schemaName string, fromCache bool) ([]string, error) {
	var tables []string
	err := i.cache.ConditionalGet(
		fmt.Sprintf("connections:%d:tables", connectionID),
		&tables,
		fromCache,
	)

	if err != nil || tables == nil {
		tables, err = i.drivers.Pgsql.Tables(int32(connectionID), schemaName)

		if err != nil {
			return tables, apperror.DriverError(err)
		}

		err = i.cache.Set(fmt.Sprintf("connections:%d:tables", connectionID), tables, nil)
		if err != nil {
			return tables, apperror.InternalServerError(err)
		}
	}

	return tables, err
}

// GetConnectionDatabases implements ICacheRepo.
func (i ICacheRepoImpl) GetConnectionDatabases(_ context.Context, connectionID uint, fromCache bool) ([]string, error) {
	var databases []string
	err := i.cache.ConditionalGet(
		fmt.Sprintf("connections:%d:databases", connectionID),
		&databases,
		fromCache,
	)

	if err != nil || databases == nil {
		databases, err = i.drivers.Pgsql.Databases(int32(connectionID), false)

		if err != nil {
			return databases, apperror.DriverError(err)
		}

		err = i.cache.Set(fmt.Sprintf("connections:%d:databases", connectionID), databases, nil)
		if err != nil {
			return databases, apperror.InternalServerError(err)
		}
	}

	return databases, err
}

// GetConnectionSchemas implements ICacheRepo.
func (i ICacheRepoImpl) GetConnectionSchemas(_ context.Context, connectionID uint, databaseName string, fromCache bool) ([]string, error) {
	var schemas []string
	err := i.cache.ConditionalGet(
		fmt.Sprintf("connections:%d:schemas", connectionID),
		&schemas,
		fromCache,
	)

	if err != nil || schemas == nil {
		schemas, err = i.drivers.Pgsql.Schemas(int32(connectionID), databaseName, false)

		if err != nil {
			return schemas, apperror.DriverError(err)
		}

		err = i.cache.Set(fmt.Sprintf("connections:%d:schemas", connectionID), schemas, nil)
		if err != nil {
			return schemas, apperror.InternalServerError(err)
		}
	}

	return schemas, err
}

// GetDatabaseVersion implements ICacheRepo.
func (i ICacheRepoImpl) GetDatabaseVersion(_ context.Context, connectionID uint, fromCache bool) (string, error) {
	var version string
	err := i.cache.ConditionalGet(
		fmt.Sprintf("connections:%d:version", connectionID),
		&version,
		fromCache,
	)

	if err != nil || version == "" {
		version, err = i.drivers.Pgsql.Version(int32(connectionID))

		if err != nil {
			return version, apperror.DriverError(err)
		}

		err = i.cache.Set(fmt.Sprintf("connections:%d:version", connectionID), version, nil)
		if err != nil {
			return version, apperror.InternalServerError(err)
		}
	}

	return version, err
}

// FlushCache implements ICacheRepo.
func (i ICacheRepoImpl) FlushCache(_ context.Context) error {
	return i.db.Exec("DELETE FROM cache_items").Error
}
