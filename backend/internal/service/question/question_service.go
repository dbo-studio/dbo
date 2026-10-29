package serviceQuestion

import (
	"context"
	"errors"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceDbtools "github.com/dbo-studio/dbo/internal/service/dbtools"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
)

var errQuestionNotFound = errors.New("report not found")

type IQuestionService interface {
	Index(ctx context.Context, req *dto.QuestionListRequest) ([]dto.QuestionResponse, error)
	Create(ctx context.Context, req *dto.QuestionCreateRequest) (*dto.QuestionResponse, error)
	Update(ctx context.Context, id uint, req *dto.QuestionUpdateRequest) (*dto.QuestionResponse, error)
	Delete(ctx context.Context, id uint) error
	// Run executes the report's query read-only, its {{name}} filters filled from params, and returns the rows as the execute_sql tool does.
	Run(ctx context.Context, id uint, params map[string]string) (json.RawMessage, error)
	// Preview runs unsaved SQL the same way, for the editor.
	Preview(ctx context.Context, req *dto.QuestionPreviewRequest) (json.RawMessage, error)
}

var _ IQuestionService = (*IQuestionServiceImpl)(nil)

type IQuestionServiceImpl struct {
	questionRepo   repository.IQuestionRepo
	connectionRepo repository.IConnectionRepo
	toolRegistry   *serviceDbtools.Registry
}

func NewQuestionService(
	questionRepo repository.IQuestionRepo,
	connectionRepo repository.IConnectionRepo,
	toolRegistry *serviceDbtools.Registry,
) IQuestionService {
	return &IQuestionServiceImpl{questionRepo: questionRepo, connectionRepo: connectionRepo, toolRegistry: toolRegistry}
}

func (s IQuestionServiceImpl) requireConnection(ctx context.Context, connectionID int32) error {
	if _, err := s.connectionRepo.Find(ctx, connectionID); err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	return nil
}

func (s IQuestionServiceImpl) find(ctx context.Context, id uint) (*model.Question, error) {
	question, err := s.questionRepo.Find(ctx, id)
	if err != nil {
		return nil, apperror.NotFound(errQuestionNotFound)
	}

	if err := s.requireConnection(ctx, int32(question.ConnectionID)); err != nil {
		return nil, apperror.NotFound(errQuestionNotFound)
	}

	return question, nil
}

func (s IQuestionServiceImpl) Index(ctx context.Context, req *dto.QuestionListRequest) ([]dto.QuestionResponse, error) {
	if err := s.requireConnection(ctx, req.ConnectionID); err != nil {
		return nil, err
	}

	questions, err := s.questionRepo.List(ctx, uint(req.ConnectionID))
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return lo.Map(questions, func(question model.Question, _ int) dto.QuestionResponse { return ToResponse(&question) }), nil
}

func (s IQuestionServiceImpl) Create(ctx context.Context, req *dto.QuestionCreateRequest) (*dto.QuestionResponse, error) {
	if err := s.requireConnection(ctx, req.ConnectionID); err != nil {
		return nil, err
	}

	// A report only ever reads; a write saved here would run on every refresh.
	if _, err := serviceDbtools.GuardReadOnlySQL(req.SQL); err != nil {
		return nil, apperror.BadRequest(err)
	}

	chart, err := json.Marshal(req.Chart)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	question := &model.Question{
		ConnectionID: uint(req.ConnectionID),
		Database:     lo.FromPtr(req.Database),
		Schema:       lo.FromPtr(req.Schema),
		Name:         req.Name,
		SQL:          req.SQL,
		ChartJSON:    string(chart),
	}

	if err := s.questionRepo.Create(ctx, question); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	response := ToResponse(question)

	return &response, nil
}

func (s IQuestionServiceImpl) Update(ctx context.Context, id uint, req *dto.QuestionUpdateRequest) (*dto.QuestionResponse, error) {
	question, err := s.find(ctx, id)
	if err != nil {
		return nil, err
	}

	if req.SQL != nil {
		if _, err := serviceDbtools.GuardReadOnlySQL(*req.SQL); err != nil {
			return nil, apperror.BadRequest(err)
		}

		question.SQL = *req.SQL
	}

	if req.Name != nil {
		question.Name = *req.Name
	}

	if req.Chart != nil {
		chart, err := json.Marshal(req.Chart)
		if err != nil {
			return nil, apperror.InternalServerError(err)
		}

		question.ChartJSON = string(chart)
	}

	if err := s.questionRepo.Save(ctx, question); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	response := ToResponse(question)

	return &response, nil
}

func (s IQuestionServiceImpl) Delete(ctx context.Context, id uint) error {
	question, err := s.find(ctx, id)
	if err != nil {
		return err
	}

	if err := s.questionRepo.Delete(ctx, question); err != nil {
		return apperror.InternalServerError(err)
	}

	return nil
}

func (s IQuestionServiceImpl) Run(ctx context.Context, id uint, params map[string]string) (json.RawMessage, error) {
	question, err := s.find(ctx, id)
	if err != nil {
		return nil, err
	}

	return s.run(ctx, serviceDbtools.ToolContext{
		ConnectionID: int32(question.ConnectionID),
		Database:     lo.EmptyableToPtr(question.Database),
		Schema:       lo.EmptyableToPtr(question.Schema),
	}, question.SQL, params)
}

func (s IQuestionServiceImpl) Preview(ctx context.Context, req *dto.QuestionPreviewRequest) (json.RawMessage, error) {
	return s.run(ctx, serviceDbtools.ToolContext{
		ConnectionID: req.ConnectionID,
		Database:     req.Database,
		Schema:       req.Schema,
	}, req.SQL, req.Params)
}

func (s IQuestionServiceImpl) run(ctx context.Context, toolCtx serviceDbtools.ToolContext, sql string, params map[string]string) (json.RawMessage, error) {
	conn, err := s.connectionRepo.Find(ctx, toolCtx.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	rendered, err := RenderParams(sql, params, databaseContract.IsMysqlFamily(conn.ConnectionType))
	if err != nil {
		return nil, apperror.BadRequest(err)
	}

	result, err := s.toolRegistry.Execute(ctx, serviceDbtools.ToolExecuteSQL, map[string]any{"sql": rendered}, toolCtx)
	if err != nil {
		return nil, apperror.BadRequest(err)
	}

	return json.RawMessage(result), nil
}

// ToResponse maps a stored report; boards reuse it for their cards.
func ToResponse(question *model.Question) dto.QuestionResponse {
	var chart dto.QuestionChart

	_ = json.Unmarshal([]byte(question.ChartJSON), &chart)

	return dto.QuestionResponse{
		ID:           question.ID,
		ConnectionID: question.ConnectionID,
		Database:     question.Database,
		Schema:       question.Schema,
		Name:         question.Name,
		SQL:          question.SQL,
		Chart:        chart,
		UpdatedAt:    lo.FromPtr(question.UpdatedAt),
	}
}
