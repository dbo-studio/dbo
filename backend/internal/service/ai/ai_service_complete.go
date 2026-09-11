package serviceAi

import (
	"context"
	"fmt"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	aiProvider "github.com/dbo-studio/dbo/internal/service/ai/provider"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

func (s *AiServiceImpl) Complete(ctx context.Context, req *dto.AiInlineCompleteRequest) (*dto.AiInlineCompleteResponse, error) {
	if err := ctx.Err(); err != nil {
		return nil, apperror.QueryCanceled()
	}

	provider, dbProvider, err := s.createProvider(ctx)
	if err != nil {
		return nil, err
	}

	if err := ctx.Err(); err != nil {
		return nil, apperror.QueryCanceled()
	}

	cacheKey := s.generateCompletionKey(ctx, req)
	if cachedResponse, found := s.getCompletionResponse(ctx, cacheKey); found {
		return cachedResponse, nil
	}

	conn, err := s.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewAIContextRepository(ctx, conn, s.cm)
	if err != nil {
		return nil, err
	}

	if err := ctx.Err(); err != nil {
		return nil, apperror.QueryCanceled()
	}

	contextStr := repo.AiCompleteContext(ctx, toAICompleteInput(req))

	if err := ctx.Err(); err != nil {
		return nil, apperror.QueryCanceled()
	}

	providerReq := &aiProvider.CompletionRequest{
		Prompt:  req.ContextOpts.Prompt,
		Suffix:  req.ContextOpts.Suffix,
		Model:   dbProvider.Model,
		Context: contextStr,
	}

	providerResp, err := provider.Complete(ctx, providerReq)
	if err != nil {
		if isRequestCanceled(ctx, err) {
			return nil, apperror.QueryCanceled()
		}

		s.logger.Error(fmt.Sprintf("AI Complete error: %v", err))

		return nil, err
	}

	response := &dto.AiInlineCompleteResponse{
		Completion: providerResp.Completion,
	}

	if providerResp.Completion != "" {
		err := s.setCompletionResponse(ctx, cacheKey, response, 5*time.Minute)
		if err != nil {
			s.logger.Error(err)
		}
	}

	return response, nil
}
