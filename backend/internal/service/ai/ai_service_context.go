package serviceAi

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	aiProvider "github.com/dbo-studio/dbo/internal/service/ai/provider"
	serviceDbtools "github.com/dbo-studio/dbo/internal/service/dbtools"
	"github.com/samber/lo"
)

func buildProviderChatRequest(
	chat *model.AiChat,
	modelName string,
	contextStr string,
	req *dto.AiChatRequest,
	engine string,
) *aiProvider.ChatRequest {
	providerReq := &aiProvider.ChatRequest{
		Messages: conversationHistory(chat),
		Summary:  chat.Summary,
		Model:    modelName,
		Context:  contextStr,
		Engine:   engine,
	}

	if req.ContextOpts == nil {
		return providerReq
	}

	opts := req.ContextOpts
	if lo.FromPtr(opts.SelectedQuery) != "" {
		providerReq.SelectedQuery = lo.FromPtr(opts.SelectedQuery)
		providerReq.Query = lo.FromPtr(opts.SelectedQuery)
	} else {
		providerReq.Query = lo.FromPtr(opts.Query)
	}

	providerReq.QueryResultSummary = lo.FromPtr(opts.QueryResultSummary)
	providerReq.ObjectDefinition = lo.FromPtr(opts.ObjectDefinition)

	return providerReq
}

// aiContext is what the assistant is told about the connection: the SQL schema, or for MongoDB and Redis the
// list of containers. The client may not name its own containers, so the list always comes from the driver.
func (s *AiServiceImpl) aiContext(ctx context.Context, conn *model.Connection, req *dto.AiChatRequest) (string, error) {
	if databaseContract.IsNoSQL(conn.ConnectionType) {
		repo, err := database.NewNoSQLRepository(ctx, conn, s.cm)
		if err != nil {
			return "", err
		}

		return serviceDbtools.ListContainers(ctx, repo)
	}

	repo, err := database.NewAIContextRepository(ctx, conn, s.cm)
	if err != nil {
		return "", err
	}

	return repo.AiContext(ctx, toAIContextInput(req))
}
