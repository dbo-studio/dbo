package repository

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

type AiChatRepoImpl struct{ db *gorm.DB }

func NewAiChatRepo(db *gorm.DB) IAiChatRepo {
	return &AiChatRepoImpl{
		db: db,
	}
}

func (r AiChatRepoImpl) List(ctx context.Context) ([]model.AiChat, error) {
	var items []model.AiChat
	return items, r.db.WithContext(ctx).Order("updated_at desc").Find(&items).Error
}

func (r AiChatRepoImpl) Find(ctx context.Context, id uint) (*model.AiChat, error) {
	var chat model.AiChat
	err := r.db.WithContext(ctx).
		Preload("Messages", "role <> ?", model.AiChatMessageRoleSystem).
		First(&chat, id).Error
	if err != nil {
		return nil, err
	}
	return &chat, nil
}

func (r AiChatRepoImpl) Create(ctx context.Context, dto *dto.AiChatCreateRequest) (*model.AiChat, error) {
	title := dto.Title
	if len(dto.Title) > 20 {
		title = dto.Title[0:20]
	}

	var chat = &model.AiChat{
		Title:        title,
		ConnectionID: uint(dto.ConnectionId),
		ProviderId:   lo.ToPtr(uint(lo.FromPtr(dto.ProviderId))),
		Model:        dto.Model,
	}

	result := r.db.WithContext(ctx).Create(chat)

	return chat, result.Error
}

func (r AiChatRepoImpl) Update(ctx context.Context, chat *model.AiChat) error {
	return r.db.WithContext(ctx).Save(chat).Error
}

func (r AiChatRepoImpl) Delete(ctx context.Context, chat *model.AiChat) error {
	return r.db.WithContext(ctx).Delete(chat).Error
}

func (r AiChatRepoImpl) AddMessage(ctx context.Context, m *model.AiChatMessage) error {
	return r.db.WithContext(ctx).Create(m).Error
}
