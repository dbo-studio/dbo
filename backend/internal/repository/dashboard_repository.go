package repository

import (
	"context"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/helper"
	"gorm.io/gorm"
)

type DashboardRepoImpl struct{ db *gorm.DB }

func NewDashboardRepo(db *gorm.DB) IDashboardRepo {
	return &DashboardRepoImpl{db: db}
}

func (r DashboardRepoImpl) withCards(db *gorm.DB) *gorm.DB {
	return db.Preload("Cards", func(db *gorm.DB) *gorm.DB { return db.Order("position") }).Preload("Cards.Question")
}

// List returns the caller's boards on a connection with their cards, oldest first.
func (r DashboardRepoImpl) List(ctx context.Context, connectionID uint) ([]model.Dashboard, error) {
	var dashboards []model.Dashboard

	err := r.withCards(r.db.WithContext(ctx)).
		Where("connection_id = ? AND owner_id = ?", connectionID, helper.CtxOwnerID(ctx)).
		Order("id").
		Find(&dashboards).Error

	return dashboards, err
}

func (r DashboardRepoImpl) Find(ctx context.Context, id uint) (*model.Dashboard, error) {
	var dashboard model.Dashboard

	err := r.withCards(r.db.WithContext(ctx)).
		Where("id = ? AND owner_id = ?", id, helper.CtxOwnerID(ctx)).
		First(&dashboard).Error
	if err != nil {
		return nil, err
	}

	return &dashboard, nil
}

func (r DashboardRepoImpl) FindByName(ctx context.Context, connectionID uint, name string) (*model.Dashboard, error) {
	var dashboard model.Dashboard

	err := r.withCards(r.db.WithContext(ctx)).
		Where("connection_id = ? AND owner_id = ? AND name = ?", connectionID, helper.CtxOwnerID(ctx), name).
		First(&dashboard).Error
	if err != nil {
		return nil, err
	}

	return &dashboard, nil
}

func (r DashboardRepoImpl) Create(ctx context.Context, dashboard *model.Dashboard) error {
	dashboard.OwnerID = helper.CtxOwnerID(ctx)

	return r.db.WithContext(ctx).Create(dashboard).Error
}

func (r DashboardRepoImpl) Delete(ctx context.Context, dashboard *model.Dashboard) error {
	return r.db.WithContext(ctx).Select("Cards").Delete(dashboard).Error
}

func (r DashboardRepoImpl) AddCard(ctx context.Context, card *model.DashboardCard) error {
	return r.db.WithContext(ctx).Create(card).Error
}

func (r DashboardRepoImpl) SaveCard(ctx context.Context, card *model.DashboardCard) error {
	return r.db.WithContext(ctx).Model(card).Select("width").Updates(card).Error
}

func (r DashboardRepoImpl) DeleteCard(ctx context.Context, card *model.DashboardCard) error {
	return r.db.WithContext(ctx).Delete(card).Error
}
