package repository

import (
	"context"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/helper"
	"gorm.io/gorm"
)

type DashboardShareRepoImpl struct{ db *gorm.DB }

func NewDashboardShareRepo(db *gorm.DB) IDashboardShareRepo {
	return &DashboardShareRepoImpl{db: db}
}

func (r DashboardShareRepoImpl) List(ctx context.Context, dashboardID uint) ([]model.DashboardShare, error) {
	var shares []model.DashboardShare

	err := r.db.WithContext(ctx).
		Where("dashboard_id = ? AND owner_id = ?", dashboardID, helper.CtxOwnerID(ctx)).
		Order("id DESC").
		Find(&shares).Error

	return shares, err
}

func (r DashboardShareRepoImpl) Find(ctx context.Context, dashboardID, id uint) (*model.DashboardShare, error) {
	var share model.DashboardShare

	err := r.db.WithContext(ctx).
		Where("id = ? AND dashboard_id = ? AND owner_id = ?", id, dashboardID, helper.CtxOwnerID(ctx)).
		First(&share).Error
	if err != nil {
		return nil, err
	}

	return &share, nil
}

// FindByTokenHash is the one lookup that is not scoped to an owner: a visitor has no account, the token is the proof.
func (r DashboardShareRepoImpl) FindByTokenHash(ctx context.Context, hash string) (*model.DashboardShare, error) {
	var share model.DashboardShare

	if err := r.db.WithContext(ctx).Where("token_hash = ?", hash).First(&share).Error; err != nil {
		return nil, err
	}

	return &share, nil
}

func (r DashboardShareRepoImpl) Create(ctx context.Context, share *model.DashboardShare) error {
	return r.db.WithContext(ctx).Create(share).Error
}

func (r DashboardShareRepoImpl) Save(ctx context.Context, share *model.DashboardShare) error {
	return r.db.WithContext(ctx).Model(share).
		Select("expires_at", "revoked_at", "password_hash").
		Updates(share).Error
}

func (r DashboardShareRepoImpl) RecordView(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Model(&model.DashboardShare{}).Where("id = ?", id).
		Updates(map[string]any{"view_count": gorm.Expr("view_count + 1"), "last_viewed_at": time.Now()}).Error
}
