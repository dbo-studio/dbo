package serviceAiChat

import (
	"context"
	"errors"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
)

type IAiChatService interface {
	Index(ctx context.Context, req *dto.AiChatListRequest) (*dto.AiChatListResponse, error)
	Detail(ctx context.Context, dto *dto.AiChatDetailRequest) (*dto.AiChatDetailResponse, error)
	Create(ctx context.Context, chat *dto.AiChatCreateRequest) (*dto.AiChatDetailResponse, error)
	Update(ctx context.Context, chatID uint, req *dto.AiChatUpdateRequest) (*dto.AiChatDetailResponse, error)
	Review(ctx context.Context, chatID uint, req *dto.AiChatReviewRequest) error
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

func (s IAiChatServiceImpl) Update(ctx context.Context, chatID uint, req *dto.AiChatUpdateRequest) (*dto.AiChatDetailResponse, error) {
	chat, err := s.aiChatRepo.Find(ctx, chatID, &dto.PaginationRequest{Page: lo.ToPtr(1), Count: lo.ToPtr(1)})
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrAiChatNotFound)
	}

	if err := s.requireConnection(ctx, int32(chat.ConnectionID)); err != nil {
		return nil, apperror.NotFound(apperror.ErrAiChatNotFound)
	}

	if req.Title != nil {
		chat.Title = *req.Title
	}

	if req.Pinned != nil {
		chat.Pinned = *req.Pinned
	}

	chat.Messages = nil

	if err := s.aiChatRepo.Update(ctx, chat); err != nil {
		return nil, apperror.InternalServerError(err)
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

var reviewKeys = map[model.AiChatMessageType]string{
	model.AiChatMessageTypeDiagramDiff: "changesetId",
	model.AiChatMessageTypePermission:  "requestId",
}

// Review stores the user's decision inside the matching card message. It is
// the claim that makes a confirm single-use: a card that already has a
// decision answers 409, and the swap is conditional on the stored content so
// concurrent confirms cannot both succeed. Only a "confirmed" claim can be
// released with "pending".
func (s IAiChatServiceImpl) Review(ctx context.Context, chatID uint, req *dto.AiChatReviewRequest) error {
	chat, err := s.aiChatRepo.Find(ctx, chatID, nil)
	if err != nil {
		return apperror.NotFound(apperror.ErrAiChatNotFound)
	}

	if err := s.requireConnection(ctx, int32(chat.ConnectionID)); err != nil {
		return apperror.NotFound(apperror.ErrAiChatNotFound)
	}

	for i := range chat.Messages {
		message := &chat.Messages[i]

		key, ok := reviewKeys[message.Type]
		if !ok {
			continue
		}

		payload := map[string]any{}
		if json.Unmarshal([]byte(message.Content), &payload) != nil || payload[key] != req.ID {
			continue
		}

		current, decided := payload["decision"]

		switch {
		case req.Decision == dto.AiReviewPending && current == dto.AiReviewConfirmed:
			delete(payload, "decision")
		case req.Decision == dto.AiReviewPending, decided:
			return apperror.Conflict(errors.New("this card was already reviewed"))
		default:
			payload["decision"] = req.Decision
		}

		raw, err := json.Marshal(payload)
		if err != nil {
			return apperror.InternalServerError(err)
		}

		swapped, err := s.aiChatRepo.UpdateMessageContent(ctx, message.ID, message.Content, string(raw))
		if err != nil {
			return apperror.InternalServerError(err)
		}

		if !swapped {
			return apperror.Conflict(errors.New("this card was already reviewed"))
		}

		return nil
	}

	return apperror.NotFound(apperror.ErrAiChatNotFound)
}
