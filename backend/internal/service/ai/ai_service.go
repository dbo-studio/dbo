package serviceAI

import (
	"context"
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	aiCache "github.com/dbo-studio/dbo/internal/service/ai/cache"
	"github.com/dbo-studio/dbo/internal/service/ai/provider"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/logger"
)

type IAiService interface {
	Chat(ctx context.Context, req *dto.AiChatRequest) (*dto.AiChatResponse, error)
	Complete(ctx context.Context, req *dto.AiInlineCompleteRequest) (*dto.AiInlineCompleteResponse, error)
}

type AiServiceImpl struct {
	connectionRepo  repository.IConnectionRepo
	aiProviderRepo  repository.IAiProviderRepo
	aiChatRepo      repository.IAiChatRepo
	cm              *databaseConnection.ConnectionManager
	logger          logger.Logger
	cacheManager    aiCache.ICacheManager
	providerFactory *provider.ProviderFactory
}

func NewAIService(
	connectionRepo repository.IConnectionRepo,
	aiProviderRepo repository.IAiProviderRepo,
	aiChatRepo repository.IAiChatRepo,
	cm *databaseConnection.ConnectionManager,
	logger logger.Logger,
	cache cache.Cache,
) IAiService {
	return &AiServiceImpl{
		connectionRepo:  connectionRepo,
		aiProviderRepo:  aiProviderRepo,
		aiChatRepo:      aiChatRepo,
		cm:              cm,
		logger:          logger,
		cacheManager:    aiCache.NewCacheManager(cache),
		providerFactory: provider.NewProviderFactory(),
	}
}

func (s *AiServiceImpl) Chat(ctx context.Context, req *dto.AiChatRequest) (*dto.AiChatResponse, error) {
	aiProvider, dbProvider, err := s.createProvider(ctx, req.ProviderId)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	chatId, chatHistory, err := s.manageChatHistory(ctx, req)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	conn, err := s.connectionRepo.Find(ctx, req.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(conn, s.cm)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	contextStr, _ := s.buildContextFromAutocomplete(repo, req.ConnectionId, req.Database, req.Schema)

	// لاگ کردن درخواست
	s.logChatRequest(req, contextStr)

	// ترکیب تاریخچه چت با پیام‌های جدید
	allMessages := append(chatHistory, req.Messages...)

	// ساخت درخواست provider
	providerReq := &provider.ChatRequest{
		Messages:    allMessages,
		Model:       req.Model,
		Temperature: dbProvider.Temperature,
		MaxTokens:   dbProvider.MaxTokens,
		Context:     contextStr,
	}

	// ارسال درخواست به AI provider
	providerResp, err := aiProvider.Chat(ctx, providerReq)
	if err != nil {
		s.logger.Error(fmt.Sprintf("AI Chat error: %v", err))
		return nil, err
	}

	// ذخیره پیام‌های جدید در تاریخچه
	if err := s.saveChatMessages(ctx, chatId, req.Messages, providerResp.Message); err != nil {
		s.logger.Error(fmt.Sprintf("Failed to save chat messages: %v", err))
		// ادامه می‌دهیم حتی اگر ذخیره‌سازی شکست بخورد
	}

	// ساخت پاسخ
	response := &dto.AiChatResponse{
		ChatId:  chatId,
		Message: providerResp.Message,
	}

	// لاگ کردن پاسخ
	s.logChatResponse(response)

	return response, nil
}

func (s *AiServiceImpl) Complete(ctx context.Context, req *dto.AiInlineCompleteRequest) (*dto.AiInlineCompleteResponse, error) {
	aiProvider, dbProvider, err := s.createProvider(ctx, req.ProviderId)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	cacheKey := s.cacheManager.GenerateCompletionKey(req, dbProvider)
	if cachedResponse, found := s.cacheManager.GetCompletionResponse(cacheKey); found {
		s.logger.Info("AI Complete ← cache hit")
		return cachedResponse, nil
	}

	conn, err := s.connectionRepo.Find(ctx, req.ConnectionId)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(conn, s.cm)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	contextStr, _ := s.buildContextFromAutocomplete(repo, req.ConnectionId, req.Database, req.Schema)

	s.logCompletionRequest(req, contextStr)

	providerReq := &provider.CompletionRequest{
		Prompt:      req.Prompt,
		Suffix:      req.Suffix,
		Language:    req.Language,
		Model:       req.Model,
		Temperature: dbProvider.Temperature,
		MaxTokens:   dbProvider.MaxTokens,
		Context:     contextStr,
	}

	providerResp, err := aiProvider.Complete(ctx, providerReq)
	if err != nil {
		s.logger.Error(fmt.Sprintf("AI Complete error: %v", err))
		return nil, err
	}

	response := &dto.AiInlineCompleteResponse{
		Completion: providerResp.Completion,
	}

	s.logCompletionResponse(response)

	s.cacheManager.SetCompletionResponse(cacheKey, response, aiCache.GetDefaultCompletionTTL())

	return response, nil
}

func (s *AiServiceImpl) createProvider(ctx context.Context, providerId *uint) (provider.IAIProvider, *model.AiProvider, error) {
	dbProvider, err := s.aiProviderRepo.Find(ctx, *providerId)
	if err != nil {
		return nil, nil, fmt.Errorf("provider with id %d not found: %w", *providerId, err)
	}

	aiProvider, err := s.providerFactory.CreateProvider(dbProvider)
	if err != nil {
		return nil, nil, err
	}

	return aiProvider, dbProvider, nil
}

// manageChatHistory مدیریت تاریخچه چت - ایجاد چت جدید یا پیدا کردن چت موجود
func (s *AiServiceImpl) manageChatHistory(ctx context.Context, req *dto.AiChatRequest) (uint, []dto.AiMessage, error) {
	var chatId uint
	var chatHistory []dto.AiMessage

	if req.ChatId != nil {
		// چت موجود - بارگیری تاریخچه
		existingChat, err := s.aiChatRepo.Find(ctx, *req.ChatId)
		if err != nil {
			return 0, nil, apperror.NotFound(apperror.ErrAiChatNotFound)
		}

		chatId = existingChat.ID

		// تبدیل پیام‌های دیتابیس به DTO
		for _, msg := range existingChat.Messages {
			chatHistory = append(chatHistory, dto.AiMessage{
				Role:    msg.Role,
				Content: msg.Content,
			})
		}
	} else {
		// چت جدید - ایجاد
		chat, err := s.aiChatRepo.Create(ctx, &dto.AiChatCreateRequest{
			Title: s.generateChatTitle(req.Messages),
		})

		if err != nil {
			return 0, nil, fmt.Errorf("failed to create new chat: %w", err)
		}

		chatId = chat.ID
		chatHistory = []dto.AiMessage{} // چت جدید - تاریخچه خالی
	}

	return chatId, chatHistory, nil
}

// saveChatMessages ذخیره پیام‌های جدید در تاریخچه چت
func (s *AiServiceImpl) saveChatMessages(ctx context.Context, chatId uint, userMessages []dto.AiMessage, aiResponse dto.AiMessage) error {
	// ذخیره پیام‌های کاربر
	for _, msg := range userMessages {
		chatMessage := &model.AiChatMessage{
			ChatId:  chatId,
			Role:    msg.Role,
			Content: msg.Content,
		}
		if err := s.aiChatRepo.AddMessage(ctx, chatMessage); err != nil {
			return fmt.Errorf("failed to save user message: %w", err)
		}
	}

	// ذخیره پاسخ AI
	aiMessage := &model.AiChatMessage{
		ChatId:  chatId,
		Role:    aiResponse.Role,
		Content: aiResponse.Content,
	}
	if err := s.aiChatRepo.AddMessage(ctx, aiMessage); err != nil {
		return fmt.Errorf("failed to save AI response: %w", err)
	}

	return nil
}

// generateChatTitle تولید عنوان برای چت جدید
func (s *AiServiceImpl) generateChatTitle(messages []dto.AiMessage) string {
	if len(messages) == 0 {
		return "New Chat"
	}

	// استفاده از اولین پیام کاربر به عنوان عنوان
	firstUserMessage := ""
	for _, msg := range messages {
		if msg.Role == "user" {
			firstUserMessage = msg.Content
			break
		}
	}

	if firstUserMessage == "" {
		return "New Chat"
	}

	// محدود کردن طول عنوان
	if len(firstUserMessage) > 50 {
		return firstUserMessage[:50] + "..."
	}

	return firstUserMessage
}

func (s *AiServiceImpl) logChatRequest(req *dto.AiChatRequest, contextStr string) {
	providerInfo := "unknown"
	modelInfo := "unknown"
	baseURL := ""

	if req.ProviderId != nil {
		providerInfo = fmt.Sprintf("id:%d", *req.ProviderId)
	}

	s.logger.Info(fmt.Sprintf("AI Chat → provider=%s model=%s baseUrl=%s msgs=%d ctxLen=%d",
		providerInfo, modelInfo, baseURL, len(req.Messages), len(contextStr)))

	if len(req.Messages) > 0 {
		last := req.Messages[len(req.Messages)-1].Content
		if len(last) > 120 {
			last = last[:120] + "…"
		}
		s.logger.Info(fmt.Sprintf("AI Chat lastMsg: %q", last))
	}
}

func (s *AiServiceImpl) logChatResponse(response *dto.AiChatResponse) {
	content := response.Message.Content
	preview := content
	if len(preview) > 120 {
		preview = preview[:120] + "…"
	}
	s.logger.Info(fmt.Sprintf("AI Chat ← len=%d preview=%q", len(content), preview))
}

func (s *AiServiceImpl) logCompletionRequest(req *dto.AiInlineCompleteRequest, contextStr string) {
	providerInfo := "unknown"
	modelInfo := "unknown"
	baseURL := ""

	if req.ProviderId != nil {
		providerInfo = fmt.Sprintf("id:%d", *req.ProviderId)
	}

	suffixLen := 0
	if req.Suffix != nil {
		suffixLen = len(*req.Suffix)
	}

	s.logger.Info(fmt.Sprintf("AI Complete → provider=%s model=%s baseUrl=%s prefixLen=%d suffixLen=%d ctxLen=%d",
		providerInfo, modelInfo, baseURL, len(req.Prompt), suffixLen, len(contextStr)))
}

func (s *AiServiceImpl) logCompletionResponse(response *dto.AiInlineCompleteResponse) {
	completion := response.Completion
	preview := completion
	if len(preview) > 120 {
		preview = preview[:120] + "…"
	}
	s.logger.Info(fmt.Sprintf("AI Complete ← len=%d preview=%q", len(completion), preview))
}

// buildContextFromAutocomplete builds a simple context string using available autocomplete metadata
func (s *AiServiceImpl) buildContextFromAutocomplete(repo databaseContract.DatabaseRepository, connectionId int32, databaseName *string, schemaName *string) (string, error) {
	ac, err := repo.AutoComplete(&dto.AutoCompleteRequest{ConnectionId: connectionId, Database: databaseName, Schema: schemaName, FromCache: false})
	if err != nil {
		return "", err
	}
	var sb strings.Builder
	if databaseName != nil {
		sb.WriteString("Database: ")
		sb.WriteString(*databaseName)
		sb.WriteString("\n")
	}
	if schemaName != nil {
		sb.WriteString("Schema: ")
		sb.WriteString(*schemaName)
		sb.WriteString("\n")
	}

	// Build a complete table->columns list. If schema is not specified, fetch per-schema columns.
	type tableKey struct{ schema, table string }
	colMap := make(map[tableKey][]string)

	if schemaName != nil {
		if isSystemSchema(*schemaName) {
			return "", nil
		}

		for _, t := range ac.Tables {
			if isSystemRelation(t) {
				continue
			}
			if cols, ok := ac.Columns[t]; ok {
				colMap[tableKey{schema: *schemaName, table: t}] = cols
			} else {
				colMap[tableKey{schema: *schemaName, table: t}] = []string{}
			}
		}
	} else {
		for _, sc := range ac.Schemas {
			if isSystemSchema(sc) {
				continue
			}
			scCopy := sc
			sub, err := repo.AutoComplete(&dto.AutoCompleteRequest{ConnectionId: connectionId, Database: databaseName, Schema: &scCopy, FromCache: false})
			if err != nil {
				continue
			}
			for _, t := range sub.Tables {
				if isSystemRelation(t) {
					continue
				}
				if cols, ok := sub.Columns[t]; ok {
					colMap[tableKey{schema: sc, table: t}] = cols
				} else {
					colMap[tableKey{schema: sc, table: t}] = []string{}
				}
			}
		}
	}

	if len(colMap) > 0 || len(ac.Tables) > 0 {
		sb.WriteString("Tables and columns:\n")
		if len(colMap) > 0 {
			for k, cols := range colMap {
				// print as schema.table when schema present
				name := k.table
				if k.schema != "" {
					name = k.schema + "." + k.table
				}
				sb.WriteString("- ")
				sb.WriteString(name)
				sb.WriteString(": ")
				if len(cols) > 0 {
					sb.WriteString(strings.Join(cols, ", "))
				}
				sb.WriteString("\n")
			}
		} else {
			// fallback: tables without columns
			for _, t := range ac.Tables {
				sb.WriteString("- ")
				sb.WriteString(t)
				sb.WriteString("\n")
			}
		}
	}
	if len(ac.Views) > 0 {
		// فیلتر ویوهای سیستمی
		filteredViews := make([]string, 0, len(ac.Views))
		for _, v := range ac.Views {
			if !isSystemRelation(v) {
				filteredViews = append(filteredViews, v)
			}
		}
		if len(filteredViews) > 0 {
			sb.WriteString("Views: ")
			sb.WriteString(strings.Join(filteredViews, ", "))
			sb.WriteString("\n")
		}
	}
	return sb.String(), nil
}

// فیلتر کردن اشیای سیستمی برای جلوگیری از ارسال نویز به مدل
func isSystemSchema(name string) bool {
	n := strings.ToLower(name)
	if n == "pg_catalog" || n == "information_schema" {
		return true
	}
	if strings.HasPrefix(n, "pg_") || strings.HasPrefix(n, "sqlite_") {
		return true
	}
	return false
}

func isSystemRelation(name string) bool {
	n := strings.ToLower(name)
	if strings.HasPrefix(n, "pg_") || strings.HasPrefix(n, "sqlite_") {
		return true
	}
	if n == "sqlite_master" || n == "sqlite_schema" || n == "sqlite_temp_schema" {
		return true
	}
	return false
}
