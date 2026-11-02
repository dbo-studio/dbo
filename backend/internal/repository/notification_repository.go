package repository

import (
	"context"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

type NotificationRepoImpl struct{ db *gorm.DB }

func NewNotificationRepo(db *gorm.DB) INotificationRepo {
	return &NotificationRepoImpl{db: db}
}

func (r NotificationRepoImpl) Create(ctx context.Context, n *model.Notification) error {
	return r.db.WithContext(ctx).Create(n).Error
}

func (r NotificationRepoImpl) List(ctx context.Context, ownerID string, limit, offset int) ([]model.Notification, error) {
	var items []model.Notification

	err := r.db.WithContext(ctx).Where("owner_id = ?", ownerID).Order("id DESC").Limit(limit).Offset(offset).Find(&items).Error

	return items, err
}

func (r NotificationRepoImpl) CountUnread(ctx context.Context, ownerID string) (int64, error) {
	var count int64

	err := r.db.WithContext(ctx).Model(&model.Notification{}).Where("owner_id = ? AND read_at IS NULL", ownerID).Count(&count).Error

	return count, err
}

func (r NotificationRepoImpl) MarkRead(ctx context.Context, ownerID string, id uint) error {
	return r.db.WithContext(ctx).Model(&model.Notification{}).
		Where("id = ? AND owner_id = ? AND read_at IS NULL", id, ownerID).Update("read_at", time.Now()).Error
}

func (r NotificationRepoImpl) MarkAllRead(ctx context.Context, ownerID string) error {
	return r.db.WithContext(ctx).Model(&model.Notification{}).
		Where("owner_id = ? AND read_at IS NULL", ownerID).Update("read_at", time.Now()).Error
}

func (r NotificationRepoImpl) Delete(ctx context.Context, ownerID string, id uint) error {
	return r.db.WithContext(ctx).Where("id = ? AND owner_id = ?", id, ownerID).Delete(&model.Notification{}).Error
}
