package serviceDashboard

import (
	"context"
	"errors"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceQuestion "github.com/dbo-studio/dbo/internal/service/question"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

var (
	errDashboardNotFound = errors.New("board not found")
	errCardNotFound      = errors.New("card not found")
	errQuestionNotFound  = errors.New("report not found")
)

type IDashboardService interface {
	Index(ctx context.Context, req *dto.DashboardListRequest) ([]dto.DashboardResponse, error)
	Create(ctx context.Context, req *dto.DashboardCreateRequest) (*dto.DashboardResponse, error)
	Delete(ctx context.Context, id uint) error
	Pin(ctx context.Context, id uint, req *dto.DashboardPinRequest) (*dto.DashboardResponse, error)
	// PinByName pins a report to the board of that name on the report's connection, creating the board when needed.
	PinByName(ctx context.Context, name string, questionID uint) (*dto.DashboardResponse, error)
	UpdateCard(ctx context.Context, id, cardID uint, req *dto.DashboardCardUpdateRequest) (*dto.DashboardResponse, error)
	Unpin(ctx context.Context, id, cardID uint) (*dto.DashboardResponse, error)
}

var _ IDashboardService = (*IDashboardServiceImpl)(nil)

type IDashboardServiceImpl struct {
	dashboardRepo  repository.IDashboardRepo
	questionRepo   repository.IQuestionRepo
	connectionRepo repository.IConnectionRepo
}

func NewDashboardService(
	dashboardRepo repository.IDashboardRepo,
	questionRepo repository.IQuestionRepo,
	connectionRepo repository.IConnectionRepo,
) IDashboardService {
	return &IDashboardServiceImpl{dashboardRepo: dashboardRepo, questionRepo: questionRepo, connectionRepo: connectionRepo}
}

func (s IDashboardServiceImpl) requireConnection(ctx context.Context, connectionID uint) error {
	if _, err := s.connectionRepo.Find(ctx, int32(connectionID)); err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	return nil
}

func (s IDashboardServiceImpl) find(ctx context.Context, id uint) (*model.Dashboard, error) {
	dashboard, err := s.dashboardRepo.Find(ctx, id)
	if err != nil {
		return nil, apperror.NotFound(errDashboardNotFound)
	}

	if err := s.requireConnection(ctx, dashboard.ConnectionID); err != nil {
		return nil, apperror.NotFound(errDashboardNotFound)
	}

	return dashboard, nil
}

func (s IDashboardServiceImpl) reload(ctx context.Context, id uint) (*dto.DashboardResponse, error) {
	dashboard, err := s.dashboardRepo.Find(ctx, id)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	response := toResponse(dashboard)

	return &response, nil
}

func (s IDashboardServiceImpl) Index(ctx context.Context, req *dto.DashboardListRequest) ([]dto.DashboardResponse, error) {
	if err := s.requireConnection(ctx, uint(req.ConnectionID)); err != nil {
		return nil, err
	}

	dashboards, err := s.dashboardRepo.List(ctx, uint(req.ConnectionID))
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return lo.Map(dashboards, func(dashboard model.Dashboard, _ int) dto.DashboardResponse { return toResponse(&dashboard) }), nil
}

func (s IDashboardServiceImpl) Create(ctx context.Context, req *dto.DashboardCreateRequest) (*dto.DashboardResponse, error) {
	if err := s.requireConnection(ctx, uint(req.ConnectionID)); err != nil {
		return nil, err
	}

	dashboard := &model.Dashboard{ConnectionID: uint(req.ConnectionID), Name: req.Name}
	if err := s.dashboardRepo.Create(ctx, dashboard); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	response := toResponse(dashboard)

	return &response, nil
}

func (s IDashboardServiceImpl) Delete(ctx context.Context, id uint) error {
	dashboard, err := s.find(ctx, id)
	if err != nil {
		return err
	}

	if err := s.dashboardRepo.Delete(ctx, dashboard); err != nil {
		return apperror.InternalServerError(err)
	}

	return nil
}

func (s IDashboardServiceImpl) Pin(ctx context.Context, id uint, req *dto.DashboardPinRequest) (*dto.DashboardResponse, error) {
	dashboard, err := s.find(ctx, id)
	if err != nil {
		return nil, err
	}

	question, err := s.questionRepo.Find(ctx, req.QuestionID)
	if err != nil || question.ConnectionID != dashboard.ConnectionID {
		return nil, apperror.NotFound(errQuestionNotFound)
	}

	// Pinning the same report twice keeps one card.
	if lo.ContainsBy(dashboard.Cards, func(card model.DashboardCard) bool { return card.QuestionID == question.ID }) {
		return s.reload(ctx, dashboard.ID)
	}

	card := &model.DashboardCard{DashboardID: dashboard.ID, QuestionID: question.ID, Position: len(dashboard.Cards), Width: 1}
	if err := s.dashboardRepo.AddCard(ctx, card); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return s.reload(ctx, dashboard.ID)
}

func (s IDashboardServiceImpl) PinByName(ctx context.Context, name string, questionID uint) (*dto.DashboardResponse, error) {
	question, err := s.questionRepo.Find(ctx, questionID)
	if err != nil {
		return nil, apperror.NotFound(errQuestionNotFound)
	}

	dashboard, err := s.dashboardRepo.FindByName(ctx, question.ConnectionID, name)
	if err != nil {
		created, createErr := s.Create(ctx, &dto.DashboardCreateRequest{ConnectionID: int32(question.ConnectionID), Name: name})
		if createErr != nil {
			return nil, createErr
		}

		return s.Pin(ctx, created.ID, &dto.DashboardPinRequest{QuestionID: questionID})
	}

	return s.Pin(ctx, dashboard.ID, &dto.DashboardPinRequest{QuestionID: questionID})
}

func (s IDashboardServiceImpl) card(ctx context.Context, id, cardID uint) (*model.DashboardCard, error) {
	dashboard, err := s.find(ctx, id)
	if err != nil {
		return nil, err
	}

	card, found := lo.Find(dashboard.Cards, func(card model.DashboardCard) bool { return card.ID == cardID })
	if !found {
		return nil, apperror.NotFound(errCardNotFound)
	}

	return &card, nil
}

func (s IDashboardServiceImpl) UpdateCard(ctx context.Context, id, cardID uint, req *dto.DashboardCardUpdateRequest) (*dto.DashboardResponse, error) {
	card, err := s.card(ctx, id, cardID)
	if err != nil {
		return nil, err
	}

	card.Width = req.Width
	if err := s.dashboardRepo.SaveCard(ctx, card); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return s.reload(ctx, id)
}

func (s IDashboardServiceImpl) Unpin(ctx context.Context, id, cardID uint) (*dto.DashboardResponse, error) {
	card, err := s.card(ctx, id, cardID)
	if err != nil {
		return nil, err
	}

	if err := s.dashboardRepo.DeleteCard(ctx, card); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return s.reload(ctx, id)
}

func toResponse(dashboard *model.Dashboard) dto.DashboardResponse {
	return dto.DashboardResponse{
		ID:           dashboard.ID,
		ConnectionID: dashboard.ConnectionID,
		Name:         dashboard.Name,
		Cards: lo.Map(dashboard.Cards, func(card model.DashboardCard, _ int) dto.DashboardCardResponse {
			return dto.DashboardCardResponse{
				ID:       card.ID,
				Position: card.Position,
				Width:    card.Width,
				Question: serviceQuestion.ToResponse(&card.Question),
			}
		}),
	}
}
