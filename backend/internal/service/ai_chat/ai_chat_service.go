package serviceAiChat

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

type IAiChatService interface {
	Index(ctx context.Context, req *dto.AiChatListRequest) (*dto.AiChatListResponse, error)
	Detail(ctx context.Context, dto *dto.AiChatDetailRequest) (*dto.AiChatDetailResponse, error)
	Create(ctx context.Context, chat *dto.AiChatCreateRequest) (*dto.AiChatDetailResponse, error)
	Delete(ctx context.Context, chatID uint) error
}

type IAiChatServiceImpl struct {
	aiChatRepo     repository.IAiChatRepo
	connectionRepo repository.IConnectionRepo
}

func NewAiChatService(aiChatRepo repository.IAiChatRepo, connectionRepo repository.IConnectionRepo) IAiChatService {
	return &IAiChatServiceImpl{
		aiChatRepo:     aiChatRepo,
		connectionRepo: connectionRepo,
	}
}

func (s IAiChatServiceImpl) requireConnection(ctx context.Context, connectionID int32) error {
	if _, err := s.connectionRepo.Find(ctx, connectionID); err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	return nil
}

func (s IAiChatServiceImpl) Index(ctx context.Context, req *dto.AiChatListRequest) (*dto.AiChatListResponse, error) {
	if err := s.requireConnection(ctx, req.ConnectionID); err != nil {
		return nil, err
	}

	chats, err := s.aiChatRepo.List(ctx, req)
	if err != nil {
		return nil, err
	}

	return aiChatToResponse(&chats), nil
}

func (s IAiChatServiceImpl) Detail(ctx context.Context, req *dto.AiChatDetailRequest) (*dto.AiChatDetailResponse, error) {
	chat, err := s.aiChatRepo.Find(ctx, req.AiChatID, &req.PaginationRequest)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrAiChatNotFound)
	}

	if err := s.requireConnection(ctx, int32(chat.ConnectionID)); err != nil {
		return nil, apperror.NotFound(apperror.ErrAiChatNotFound)
	}

	return aiChatDetailToResponse(chat), nil
}

func (s IAiChatServiceImpl) Create(ctx context.Context, req *dto.AiChatCreateRequest) (*dto.AiChatDetailResponse, error) {
	if err := s.requireConnection(ctx, req.ConnectionID); err != nil {
		return nil, err
	}

	chat, err := s.aiChatRepo.Create(ctx, req)
	if err != nil {
		return nil, err
	}

	return aiChatDetailToResponse(chat), nil
}

func (s IAiChatServiceImpl) Delete(ctx context.Context, chatID uint) error {
	chat, err := s.aiChatRepo.Find(ctx, chatID, nil)
	if err != nil {
		return apperror.NotFound(apperror.ErrAiChatNotFound)
	}

	if err := s.requireConnection(ctx, int32(chat.ConnectionID)); err != nil {
		return apperror.NotFound(apperror.ErrAiChatNotFound)
	}

	return s.aiChatRepo.Delete(ctx, chat)
}
