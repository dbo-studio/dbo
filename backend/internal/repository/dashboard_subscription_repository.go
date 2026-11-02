package repository

import (
	"context"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/helper"
	"gorm.io/gorm"
)

// runHistoryLimit is how many runs a subscription keeps.
const runHistoryLimit = 30

type DashboardSubscriptionRepoImpl struct{ db *gorm.DB }

func NewDashboardSubscriptionRepo(db *gorm.DB) IDashboardSubscriptionRepo {
	return &DashboardSubscriptionRepoImpl{db: db}
}

func (r DashboardSubscriptionRepoImpl) List(ctx context.Context, dashboardID uint) ([]model.DashboardSubscription, error) {
	var subs []model.DashboardSubscription

	err := r.db.WithContext(ctx).
		Where("dashboard_id = ? AND owner_id = ?", dashboardID, helper.CtxOwnerID(ctx)).
		Order("id").Find(&subs).Error

	return subs, err
}

func (r DashboardSubscriptionRepoImpl) Find(ctx context.Context, dashboardID, id uint) (*model.DashboardSubscription, error) {
	var sub model.DashboardSubscription

	err := r.db.WithContext(ctx).
		Where("id = ? AND dashboard_id = ? AND owner_id = ?", id, dashboardID, helper.CtxOwnerID(ctx)).
		First(&sub).Error
	if err != nil {
		return nil, err
	}

	return &sub, nil
}

// Times are compared as text in SQLite, so every one goes in and is compared in UTC.
// Due is the scheduler's query: it is not scoped to an owner, each run is made as its subscription's owner.
func (r DashboardSubscriptionRepoImpl) Due(ctx context.Context, now time.Time, limit int) ([]model.DashboardSubscription, error) {
	var subs []model.DashboardSubscription

	err := r.db.WithContext(ctx).
		Where("enabled = ? AND next_run_at <= ?", true, now.UTC()).
		Order("next_run_at").Limit(limit).Find(&subs).Error

	return subs, err
}

// Overdue lists enabled subscriptions whose time passed before `cutoff`: runs missed while the app was off.
func (r DashboardSubscriptionRepoImpl) Overdue(ctx context.Context, cutoff time.Time) ([]model.DashboardSubscription, error) {
	var subs []model.DashboardSubscription

	err := r.db.WithContext(ctx).Where("enabled = ? AND next_run_at < ?", true, cutoff.UTC()).Find(&subs).Error

	return subs, err
}

func (r DashboardSubscriptionRepoImpl) Create(ctx context.Context, sub *model.DashboardSubscription) error {
	return r.db.WithContext(ctx).Create(sub).Error
}

func (r DashboardSubscriptionRepoImpl) Save(ctx context.Context, sub *model.DashboardSubscription) error {
	return r.db.WithContext(ctx).Save(sub).Error
}

func (r DashboardSubscriptionRepoImpl) SetNextRun(ctx context.Context, id uint, next time.Time) error {
	return r.db.WithContext(ctx).Model(&model.DashboardSubscription{}).Where("id = ?", id).Update("next_run_at", next.UTC()).Error
}

func (r DashboardSubscriptionRepoImpl) SaveResult(ctx context.Context, sub *model.DashboardSubscription) error {
	return r.db.WithContext(ctx).Model(sub).
		Select("last_run_at", "last_status", "last_error", "consecutive_failures", "enabled").
		Updates(sub).Error
}

func (r DashboardSubscriptionRepoImpl) Delete(ctx context.Context, sub *model.DashboardSubscription) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("subscription_id = ?", sub.ID).Delete(&model.DashboardSubscriptionRun{}).Error; err != nil {
			return err
		}

		return tx.Delete(sub).Error
	})
}

func (r DashboardSubscriptionRepoImpl) AddRun(ctx context.Context, run *model.DashboardSubscriptionRun) error {
	if err := r.db.WithContext(ctx).Create(run).Error; err != nil {
		return err
	}

	// Keep the newest runs only.
	return r.db.WithContext(ctx).
		Where("subscription_id = ? AND id NOT IN (?)", run.SubscriptionID,
			r.db.Model(&model.DashboardSubscriptionRun{}).Select("id").
				Where("subscription_id = ?", run.SubscriptionID).Order("id DESC").Limit(runHistoryLimit)).
		Delete(&model.DashboardSubscriptionRun{}).Error
}

func (r DashboardSubscriptionRepoImpl) Runs(ctx context.Context, subscriptionID uint) ([]model.DashboardSubscriptionRun, error) {
	var runs []model.DashboardSubscriptionRun

	err := r.db.WithContext(ctx).Where("subscription_id = ?", subscriptionID).Order("id DESC").Limit(runHistoryLimit).Find(&runs).Error

	return runs, err
}

func (r DashboardSubscriptionRepoImpl) GetSmtp(ctx context.Context) (*model.SmtpSettings, error) {
	var settings model.SmtpSettings

	err := r.db.WithContext(ctx).Where("id = 1").Limit(1).Find(&settings).Error
	if err != nil {
		return nil, err
	}

	if settings.ID == 0 {
		return &model.SmtpSettings{ID: 1, Port: 587, Security: "starttls"}, nil
	}

	return &settings, nil
}

func (r DashboardSubscriptionRepoImpl) SaveSmtp(ctx context.Context, settings *model.SmtpSettings) error {
	settings.ID = 1

	return r.db.WithContext(ctx).Save(settings).Error
}
