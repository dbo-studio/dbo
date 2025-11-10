package serviceAi

import (
	"context"
	"fmt"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	serviceAiProvider "github.com/dbo-studio/dbo/internal/service/ai/provider"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

func (s *AiServiceImpl) Complete(ctx context.Context, req *dto.AiInlineCompleteRequest) (*dto.AiInlineCompleteResponse, error) {
	chats, err := s.aiChatRepo.List(ctx, &dto.AiChatListRequest{
		ConnectionId: req.ConnectionId,
		PaginationRequest: dto.PaginationRequest{
			Page:  lo.ToPtr(1),
			Count: lo.ToPtr(1),
		},
	})

	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	if len(chats) == 0 {
		return nil, apperror.BadRequest(apperror.ErrAiNoSelectedModel)
	}

	provider, dbProvider, err := s.createProvider(ctx)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	cacheKey := s.generateCompletionKey(req)
	if cachedResponse, found := s.getCompletionResponse(cacheKey); found {
		return cachedResponse, nil
	}

	conn, err := s.connectionRepo.Find(ctx, req.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(ctx, conn, s.cm, s.cache)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	contextStr := repo.AiCompleteContext(req)

	providerReq := &serviceAiProvider.CompletionRequest{
		Prompt:  req.ContextOpts.Prompt,
		Suffix:  req.ContextOpts.Suffix,
		Model:   dbProvider.Model,
		Context: contextStr,
	}

	providerResp, err := provider.Complete(ctx, providerReq)
	if err != nil {
		s.logger.Error(fmt.Sprintf("AI Complete error: %v", err))
		return nil, err
	}

	response := &dto.AiInlineCompleteResponse{
		Completion: providerResp.Completion,
	}

	if providerResp.Completion != "" {
		err := s.setCompletionResponse(cacheKey, response, 5*time.Minute)
		if err != nil {
			s.logger.Error(err)
		}
	}

	return response, nil
}
