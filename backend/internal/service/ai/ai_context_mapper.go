package serviceAi

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

func toAIContextInput(req *dto.AiChatRequest) *databaseContract.AIContextInput {
	if req == nil || req.ContextOpts == nil {
		return nil
	}

	opts := req.ContextOpts

	return &databaseContract.AIContextInput{
		Database:           opts.Database,
		Schema:             opts.Schema,
		Tables:             opts.Tables,
		Views:              opts.Views,
		Query:              opts.Query,
		SelectedQuery:      opts.SelectedQuery,
		ObjectDefinition:   opts.ObjectDefinition,
		QueryResultSummary: opts.QueryResultSummary,
	}
}

func toAICompleteInput(req *dto.AiInlineCompleteRequest) *databaseContract.AICompleteInput {
	if req == nil {
		return nil
	}

	return &databaseContract.AICompleteInput{
		Database: req.ContextOpts.Database,
		Schema:   req.ContextOpts.Schema,
		Prompt:   req.ContextOpts.Prompt,
		Suffix:   req.ContextOpts.Suffix,
	}
}
