package aichat

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

type IAiChatService interface {
	Index(ctx context.Context) (*dto.AiChatListResponse, error)
	Detail(ctx context.Context, dto *dto.AiChatDetailRequest) (*dto.AiChatDetailResponse, error)
	Create(ctx context.Context, chat *dto.AiChatCreateRequest) (*dto.AiChatDetailResponse, error)
	Delete(ctx context.Context, chatId uint) (*dto.AiChatListResponse, error)
}

type IAiChatServiceImpl struct {
	aiChatRepo repository.IAiChatRepo
}

func NewAiChatService(aiChatRepo repository.IAiChatRepo) IAiChatService {
	return &IAiChatServiceImpl{
		aiChatRepo: aiChatRepo,
	}
}

func (s IAiChatServiceImpl) Index(ctx context.Context) (*dto.AiChatListResponse, error) {
	chats, err := s.aiChatRepo.List(ctx)
	if err != nil {
		return nil, err
	}

	return aiChatToResponse(&chats), nil
}

func (s IAiChatServiceImpl) Detail(ctx context.Context, req *dto.AiChatDetailRequest) (*dto.AiChatDetailResponse, error) {
	chat, err := s.aiChatRepo.Find(ctx, req.AiChatId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrAiChatNotFound)
	}

	return aiChatDetailToResponse(chat), nil
}

func (s IAiChatServiceImpl) Create(ctx context.Context, req *dto.AiChatCreateRequest) (*dto.AiChatDetailResponse, error) {
	chat, err := s.aiChatRepo.Create(ctx, req)
	if err != nil {
		return nil, err
	}

	return aiChatDetailToResponse(chat), nil
}

func (s IAiChatServiceImpl) Delete(ctx context.Context, chatId uint) (*dto.AiChatListResponse, error) {
	chat, err := s.aiChatRepo.Find(ctx, chatId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrAiChatNotFound)
	}

	err = s.aiChatRepo.Delete(ctx, chat)
	if err != nil {
		return nil, err
	}

	return s.Index(ctx)
}
