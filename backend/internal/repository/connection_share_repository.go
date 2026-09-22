package repository

import (
	"context"
	"errors"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type IConnectionShareRepoImpl struct {
	db *gorm.DB
}

func NewConnectionShareRepo(db *gorm.DB) IConnectionShareRepo {
	return &IConnectionShareRepoImpl{db: db}
}

func (r IConnectionShareRepoImpl) ListByUser(ctx context.Context, userID string) ([]model.ConnectionShare, error) {
	var shares []model.ConnectionShare

	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Find(&shares).Error

	return shares, err
}

func (r IConnectionShareRepoImpl) ListByConnection(ctx context.Context, connectionID uint) ([]model.ConnectionShare, error) {
	var shares []model.ConnectionShare

	err := r.db.WithContext(ctx).Where("connection_id = ?", connectionID).Find(&shares).Error

	return shares, err
}

func (r IConnectionShareRepoImpl) ListAll(ctx context.Context) ([]model.ConnectionShare, error) {
	var shares []model.ConnectionShare

	err := r.db.WithContext(ctx).Find(&shares).Error

	return shares, err
}

func (r IConnectionShareRepoImpl) Find(ctx context.Context, connectionID uint, userID string) (*model.ConnectionShare, error) {
	var share model.ConnectionShare

	err := r.db.WithContext(ctx).
		Where("connection_id = ? AND user_id = ?", connectionID, userID).
		First(&share).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.ErrConnectionShareNotFound
		}

		return nil, err
	}

	return &share, nil
}

func (r IConnectionShareRepoImpl) Upsert(ctx context.Context, share *model.ConnectionShare) error {
	if share.CreatedAt.IsZero() {
		share.CreatedAt = time.Now().UTC()
	}

	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "connection_id"}, {Name: "user_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"role"}),
	}).Create(share).Error
}

func (r IConnectionShareRepoImpl) Delete(ctx context.Context, connectionID uint, userID string) error {
	return r.db.WithContext(ctx).
		Where("connection_id = ? AND user_id = ?", connectionID, userID).
		Delete(&model.ConnectionShare{}).Error
}

func (r IConnectionShareRepoImpl) DeleteByConnection(ctx context.Context, connectionID uint) error {
	return r.db.WithContext(ctx).
		Where("connection_id = ?", connectionID).
		Delete(&model.ConnectionShare{}).Error
}
