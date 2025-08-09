package repository

import (
	"context"

	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

type IAiRepo interface {
	ListProfiles(ctx context.Context) ([]model.AIProvider, error)
	CreateProfile(ctx context.Context, p *model.AIProvider) error
	UpdateProfile(ctx context.Context, p *model.AIProvider) error
	DeleteProfile(ctx context.Context, id uint) error

	ListThreads(ctx context.Context) ([]model.AIThread, error)
	CreateThread(ctx context.Context, t *model.AIThread) error
	DeleteThread(ctx context.Context, id uint) error
	ListMessages(ctx context.Context, threadID uint) ([]model.AIMessage, error)
	AddMessage(ctx context.Context, m *model.AIMessage) error
}

type AiRepo struct{ db *gorm.DB }

func NewAiRepo(db *gorm.DB) *AiRepo { return &AiRepo{db: db} }

func (r *AiRepo) ListProfiles(_ context.Context) ([]model.AIProvider, error) {
	var items []model.AIProvider
	return items, r.db.Order("id desc").Find(&items).Error
}
func (r *AiRepo) CreateProfile(_ context.Context, p *model.AIProvider) error {
	return r.db.Create(p).Error
}
func (r *AiRepo) UpdateProfile(_ context.Context, p *model.AIProvider) error {
	return r.db.Save(p).Error
}
func (r *AiRepo) DeleteProfile(_ context.Context, id uint) error {
	return r.db.Delete(&model.AIProvider{}, id).Error
}

func (r *AiRepo) ListThreads(_ context.Context) ([]model.AIThread, error) {
	var items []model.AIThread
	return items, r.db.Order("id desc").Find(&items).Error
}
func (r *AiRepo) CreateThread(_ context.Context, t *model.AIThread) error {
	return r.db.Create(t).Error
}
func (r *AiRepo) DeleteThread(_ context.Context, id uint) error {
	return r.db.Delete(&model.AIThread{}, id).Error
}
func (r *AiRepo) ListMessages(_ context.Context, threadID uint) ([]model.AIMessage, error) {
	var items []model.AIMessage
	return items, r.db.Where("thread_id = ?", threadID).Order("id").Find(&items).Error
}
func (r *AiRepo) AddMessage(_ context.Context, m *model.AIMessage) error { return r.db.Create(m).Error }
