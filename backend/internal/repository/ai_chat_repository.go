package repository

import (
	"context"
	"slices"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/db/scope"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

type AiChatRepoImpl struct{ db *gorm.DB }

func NewAiChatRepo(db *gorm.DB) IAiChatRepo {
	return &AiChatRepoImpl{
		db: db,
	}
}

func (r AiChatRepoImpl) List(ctx context.Context, req *dto.AiChatListRequest) ([]model.AiChat, error) {
	var chats []model.AiChat

	result := r.db.Scopes(scope.Paginate(&req.PaginationRequest)).
		Where("connection_id = ?", req.ConnectionId).
		Order("updated_at desc").
		Find(&chats)

	if result.Error != nil {
		return nil, result.Error
	}

	return chats, nil
}

func (r AiChatRepoImpl) Find(ctx context.Context, id uint, pagination *dto.PaginationRequest) (*model.AiChat, error) {
	var chat model.AiChat
	err := r.db.WithContext(ctx).First(&chat, id).Error
	if err != nil {
		return nil, err
	}

	var messages []model.AiChatMessage

	db := r.db.WithContext(ctx)
	if pagination != nil {
		db = db.Scopes(scope.Paginate(pagination))
	}

	err = db.Where("chat_id = ?", id).
		Order("created_at desc").
		Find(&messages).Error

	if err != nil {
		return nil, err
	}

	slices.Reverse(messages)
	chat.Messages = messages

	return &chat, nil
}

func (r AiChatRepoImpl) Create(ctx context.Context, dto *dto.AiChatCreateRequest) (*model.AiChat, error) {
	title := dto.Title
	if len(dto.Title) > 20 {
		title = dto.Title[0:20]
	}

	err := r.db.WithContext(ctx).Where("id IN (SELECT ai_chats.id FROM ai_chats LEFT JOIN ai_chat_messages ON ai_chats.id = ai_chat_messages.chat_id GROUP BY ai_chats.id HAVING COUNT(ai_chat_messages.id) = 0)").Delete(&model.AiChat{}).Error
	if err != nil {
		return nil, err
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
	if len(m.Content) == 0 {
		return nil
	}

	return r.db.WithContext(ctx).Create(m).Error
}
