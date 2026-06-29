package databaseContract

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
)

type DatabaseRepository interface {
	QueryRepository
	AIContextRepository
	AIMetadataRepository
}

type QueryRepository interface {
	Version(ctx context.Context) (string, error)
	RunQuery(ctx context.Context, dto *dto.RunQueryRequest) (*dto.RunQueryResponse, error)
	UpdateQuery(ctx context.Context, dto *dto.UpdateQueryRequest) (*dto.UpdateQueryResponse, error)
	RunRawQuery(ctx context.Context, dto *dto.RawQueryRequest) (*dto.RawQueryResponse, error)
	Tree(ctx context.Context, parentID string) (*TreeNode, error)
	GetFormTabs(ctx context.Context, action TreeNodeActionName) []FormTab
	Objects(ctx context.Context, nodeID string, tabID TreeTab, action TreeNodeActionName) (*FormResponse, error)
	GetDynamicFieldOptions(ctx context.Context, req *DynamicFieldRequest) ([]FormFieldOption, error)
	Execute(ctx context.Context, nodeID string, action TreeNodeActionName, params []byte) error
	PreviewExecute(ctx context.Context, nodeID string, action TreeNodeActionName, params []byte) ([]string, error)
	AutoComplete(ctx context.Context, dto *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error)
	ImportData(ctx context.Context, job dto.ImportJob, rows [][]string, columns []string) (*ImportResult, error)
}

type AIContextRepository interface {
	AiContext(ctx context.Context, dto *dto.AiChatRequest) (string, error)
	AiCompleteContext(ctx context.Context, dto *dto.AiInlineCompleteRequest) string
}

type AIMetadataRepository interface {
	ListTableNames(ctx context.Context, database, schema *string) ([]string, error)
	ListViewNames(ctx context.Context, database, schema *string) ([]string, error)
	DescribeTable(ctx context.Context, table string, database, schema *string) (string, error)
}

type RawQueryRepository interface {
	RunRawQuery(ctx context.Context, dto *dto.RawQueryRequest) (*dto.RawQueryResponse, error)
}

type DBToolsRepository interface {
	AIMetadataRepository
	RawQueryRepository
}

type AIContextColumnProvider interface {
	TableColumns(ctx context.Context, table string, opts AIContextOptions) ([]AIContextColumn, error)
	ViewColumns(ctx context.Context, view string, opts AIContextOptions) ([]AIContextColumn, error)
}
