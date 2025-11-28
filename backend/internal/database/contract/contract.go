package databaseContract

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
)

type DatabaseRepository interface {
	Version(ctx context.Context) (string, error)
	RunQuery(ctx context.Context, dto *dto.RunQueryRequest) (*dto.RunQueryResponse, error)
	UpdateQuery(ctx context.Context, dto *dto.UpdateQueryRequest) (*dto.UpdateQueryResponse, error)
	RunRawQuery(ctx context.Context, dto *dto.RawQueryRequest) (*dto.RawQueryResponse, error)
	Tree(ctx context.Context, parentID string) (*TreeNode, error)
	GetFormTabs(ctx context.Context, action TreeNodeActionName) []FormTab
	GetFormSchema(ctx context.Context, nodeID string, tabID TreeTab, action TreeNodeActionName) []FormField
	Objects(ctx context.Context, nodeID string, tabID TreeTab, action TreeNodeActionName) (*FormResponse, error)
	GetDynamicFieldOptions(ctx context.Context, req *DynamicFieldRequest) ([]FormFieldOption, error)
	Execute(ctx context.Context, nodeID string, action TreeNodeActionName, params []byte) error
	AutoComplete(ctx context.Context, dto *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error)
	ImportData(ctx context.Context, job dto.ImportJob, rows [][]string, columns []string) (*ImportResult, error)
	AiContext(ctx context.Context, dto *dto.AiChatRequest) (string, error)
	AiCompleteContext(ctx context.Context, dto *dto.AiInlineCompleteRequest) string
}
