package repository

import (
	"context"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

type nosqlRecycleRepoImpl struct{ db *gorm.DB }

func NewNoSQLRecycleRepo(db *gorm.DB) INoSQLRecycleRepo { return &nosqlRecycleRepoImpl{db: db} }

func (r *nosqlRecycleRepoImpl) Create(ctx context.Context, e *model.NoSQLRecycleEntry) error {
	return r.db.WithContext(ctx).Create(e).Error
}

// List returns metadata only (no payload), newest first.
func (r *nosqlRecycleRepoImpl) List(ctx context.Context, ownerID string, connectionID int32) ([]model.NoSQLRecycleEntry, error) {
	var out []model.NoSQLRecycleEntry

	err := r.db.WithContext(ctx).
		Select("id", "owner_id", "connection_id", "container_id", "item_id", "ttl_ms", "size", "created_at", "expires_at").
		Where("owner_id = ? AND connection_id = ? AND expires_at > ?", ownerID, connectionID, time.Now()).
		Order("id DESC").Find(&out).Error

	return out, err
}

func (r *nosqlRecycleRepoImpl) Find(ctx context.Context, ownerID string, id uint) (*model.NoSQLRecycleEntry, error) {
	var e model.NoSQLRecycleEntry

	if err := r.db.WithContext(ctx).Where("owner_id = ? AND id = ?", ownerID, id).First(&e).Error; err != nil {
		return nil, err
	}

	return &e, nil
}

func (r *nosqlRecycleRepoImpl) Delete(ctx context.Context, ownerID string, id uint) error {
	return r.db.WithContext(ctx).Where("owner_id = ? AND id = ?", ownerID, id).Delete(&model.NoSQLRecycleEntry{}).Error
}

// Prune drops expired rows, then the oldest rows of this owner until count and total size fit the caps.
func (r *nosqlRecycleRepoImpl) Prune(ctx context.Context, ownerID string, maxEntries, maxBytes int) error {
	db := r.db.WithContext(ctx)

	if err := db.Where("expires_at <= ?", time.Now()).Delete(&model.NoSQLRecycleEntry{}).Error; err != nil {
		return err
	}

	var rows []model.NoSQLRecycleEntry
	if err := db.Select("id", "size").Where("owner_id = ?", ownerID).Order("id DESC").Find(&rows).Error; err != nil {
		return err
	}

	total := 0

	for i, row := range rows {
		total += row.Size
		if i < maxEntries && total <= maxBytes {
			continue
		}

		if err := db.Where("id = ?", row.ID).Delete(&model.NoSQLRecycleEntry{}).Error; err != nil {
			return err
		}
	}

	return nil
}
