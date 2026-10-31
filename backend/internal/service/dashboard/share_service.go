package serviceDashboard

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceQuestion "github.com/dbo-studio/dbo/internal/service/question"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
	"golang.org/x/crypto/bcrypt"
)

// A visitor's page load runs every report once; the answer is reused this long so a shared link
// cannot be used to hammer the database behind it.
const publicResultTTL = 30 * time.Second

var (
	errShareUnavailable     = errors.New("share links need DBO running as a server; a desktop app cannot be reached by others")
	errShareNotFound        = errors.New("link not available")
	errShareReportFailed    = errors.New("this report could not be loaded")
	errSharePasswordNeeded  = errors.New("share_password_required")
	errSharePasswordInvalid = errors.New("share_password_invalid")
)

type IShareService interface {
	List(ctx context.Context, dashboardID uint) (*dto.DashboardShareListResponse, error)
	// Create makes a link; the response carries the token, the only time it is shown.
	Create(ctx context.Context, dashboardID uint, req *dto.DashboardShareCreateRequest) (*dto.DashboardShareResponse, error)
	Update(ctx context.Context, dashboardID, shareID uint, req *dto.DashboardShareUpdateRequest) (*dto.DashboardShareResponse, error)
	Revoke(ctx context.Context, dashboardID, shareID uint) (*dto.DashboardShareResponse, error)
	// View is the public side: the dashboard of a link with every report run on the owner's connection.
	View(ctx context.Context, token, password string) (*dto.PublicDashboardResponse, error)
}

var _ IShareService = (*IShareServiceImpl)(nil)

type cachedView struct {
	at   time.Time
	view *dto.PublicDashboardResponse
}

type IShareServiceImpl struct {
	shareRepo       repository.IDashboardShareRepo
	dashboardRepo   repository.IDashboardRepo
	questionService serviceQuestion.IQuestionService
	cfg             *config.Config
	logger          logger.Logger

	mu    sync.Mutex
	cache map[uint]cachedView
}

func NewShareService(
	shareRepo repository.IDashboardShareRepo,
	dashboardRepo repository.IDashboardRepo,
	questionService serviceQuestion.IQuestionService,
	cfg *config.Config,
	logger logger.Logger,
) IShareService {
	return &IShareServiceImpl{
		shareRepo:       shareRepo,
		dashboardRepo:   dashboardRepo,
		questionService: questionService,
		cfg:             cfg,
		logger:          logger,
		cache:           map[uint]cachedView{},
	}
}

func (s *IShareServiceImpl) available() bool {
	return s.cfg != nil && s.cfg.App.Client != config.ClientDesktop
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))

	return hex.EncodeToString(sum[:])
}

func toShareResponse(share *model.DashboardShare) dto.DashboardShareResponse {
	return dto.DashboardShareResponse{
		ID:           share.ID,
		CreatedAt:    lo.FromPtr(share.CreatedAt),
		ExpiresAt:    share.ExpiresAt,
		Revoked:      share.RevokedAt != nil,
		HasPassword:  share.PasswordHash != "",
		ViewCount:    share.ViewCount,
		LastViewedAt: share.LastViewedAt,
	}
}

func (s *IShareServiceImpl) requireBoard(ctx context.Context, dashboardID uint) (*model.Dashboard, error) {
	dashboard, err := s.dashboardRepo.Find(ctx, dashboardID)
	if err != nil {
		return nil, apperror.NotFound(errDashboardNotFound)
	}

	return dashboard, nil
}

func (s *IShareServiceImpl) find(ctx context.Context, dashboardID, shareID uint) (*model.DashboardShare, error) {
	if _, err := s.requireBoard(ctx, dashboardID); err != nil {
		return nil, err
	}

	share, err := s.shareRepo.Find(ctx, dashboardID, shareID)
	if err != nil {
		return nil, apperror.NotFound(errShareNotFound)
	}

	return share, nil
}

func hashPassword(password string) (string, error) {
	if password == "" {
		return "", nil
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	return string(hash), err
}

func (s *IShareServiceImpl) List(ctx context.Context, dashboardID uint) (*dto.DashboardShareListResponse, error) {
	out := &dto.DashboardShareListResponse{Available: s.available(), Items: []dto.DashboardShareResponse{}}

	if _, err := s.requireBoard(ctx, dashboardID); err != nil {
		return nil, err
	}

	shares, err := s.shareRepo.List(ctx, dashboardID)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	for i := range shares {
		out.Items = append(out.Items, toShareResponse(&shares[i]))
	}

	return out, nil
}

func (s *IShareServiceImpl) Create(ctx context.Context, dashboardID uint, req *dto.DashboardShareCreateRequest) (*dto.DashboardShareResponse, error) {
	if !s.available() {
		return nil, apperror.BadRequest(errShareUnavailable)
	}

	if _, err := s.requireBoard(ctx, dashboardID); err != nil {
		return nil, err
	}

	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	token := base64.RawURLEncoding.EncodeToString(raw)

	passwordHash, err := hashPassword(req.Password)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	share := &model.DashboardShare{
		OwnerID:      helper.CtxOwnerID(ctx),
		DashboardID:  dashboardID,
		TokenHash:    hashToken(token),
		PasswordHash: passwordHash,
		ExpiresAt:    req.ExpiresAt,
	}
	if err := s.shareRepo.Create(ctx, share); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	s.logger.Info(fmt.Sprintf("dashboard share %d created for dashboard %d (password: %t, expires: %v)", share.ID, dashboardID, passwordHash != "", req.ExpiresAt))

	response := toShareResponse(share)
	response.Token = token

	return &response, nil
}

func (s *IShareServiceImpl) Update(ctx context.Context, dashboardID, shareID uint, req *dto.DashboardShareUpdateRequest) (*dto.DashboardShareResponse, error) {
	share, err := s.find(ctx, dashboardID, shareID)
	if err != nil {
		return nil, err
	}

	if share.RevokedAt != nil {
		return nil, apperror.BadRequest(errShareNotFound)
	}

	switch {
	case req.ClearExpiry:
		share.ExpiresAt = nil
	case req.ExpiresAt != nil:
		share.ExpiresAt = req.ExpiresAt
	}

	if req.Password != nil {
		if share.PasswordHash, err = hashPassword(*req.Password); err != nil {
			return nil, apperror.InternalServerError(err)
		}
	}

	if err := s.shareRepo.Save(ctx, share); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	s.logger.Info(fmt.Sprintf("dashboard share %d updated", share.ID))

	response := toShareResponse(share)

	return &response, nil
}

func (s *IShareServiceImpl) Revoke(ctx context.Context, dashboardID, shareID uint) (*dto.DashboardShareResponse, error) {
	share, err := s.find(ctx, dashboardID, shareID)
	if err != nil {
		return nil, err
	}

	if share.RevokedAt == nil {
		share.RevokedAt = lo.ToPtr(time.Now())
		if err := s.shareRepo.Save(ctx, share); err != nil {
			return nil, apperror.InternalServerError(err)
		}

		s.logger.Info(fmt.Sprintf("dashboard share %d revoked", share.ID))
	}

	s.mu.Lock()
	delete(s.cache, share.ID)
	s.mu.Unlock()

	response := toShareResponse(share)

	return &response, nil
}

func shareAuthError(err error, message string) error {
	return &apperror.AppError{Code: http.StatusUnauthorized, Message: message, Err: err}
}

func (s *IShareServiceImpl) View(ctx context.Context, token, password string) (*dto.PublicDashboardResponse, error) {
	if !s.available() || token == "" {
		return nil, apperror.NotFound(errShareNotFound)
	}

	share, err := s.shareRepo.FindByTokenHash(ctx, hashToken(token))
	// One answer for every dead link, so a visitor learns nothing about which tokens ever existed.
	if err != nil || share.RevokedAt != nil || (share.ExpiresAt != nil && !share.ExpiresAt.After(time.Now())) {
		return nil, apperror.NotFound(errShareNotFound)
	}

	if share.PasswordHash != "" {
		if password == "" {
			return nil, shareAuthError(errSharePasswordNeeded, "share_password_required")
		}

		if bcrypt.CompareHashAndPassword([]byte(share.PasswordHash), []byte(password)) != nil {
			s.logger.Warn(fmt.Sprintf("dashboard share %d: wrong password", share.ID))

			return nil, shareAuthError(errSharePasswordInvalid, "share_password_invalid")
		}
	}

	if err := s.shareRepo.RecordView(ctx, share.ID); err != nil {
		s.logger.Error(err)
	}

	s.mu.Lock()
	hit, cached := s.cache[share.ID]
	s.mu.Unlock()

	if cached && time.Since(hit.at) < publicResultTTL {
		return hit.view, nil
	}

	view, err := s.build(ctx, share)
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	s.cache[share.ID] = cachedView{at: time.Now(), view: view}
	s.mu.Unlock()

	return view, nil
}

// publicResult keeps the rows and column names of a run and drops everything else the tool reports,
// which includes the executed query.
func publicResult(raw json.RawMessage) (*dto.PublicResult, error) {
	var run struct {
		Columns []dto.PublicColumn `json:"columns"`
		Rows    []map[string]any   `json:"rows"`
	}
	if err := json.Unmarshal(raw, &run); err != nil {
		return nil, err
	}

	isColumn := lo.SliceToMap(run.Columns, func(column dto.PublicColumn) (string, bool) { return column.Name, true })

	for _, row := range run.Rows {
		// Grid bookkeeping of the editor, not data; a real column of that name stays.
		for _, key := range []string{"dbo_index", "editable"} {
			if !isColumn[key] {
				delete(row, key)
			}
		}
	}

	return &dto.PublicResult{Columns: run.Columns, Rows: run.Rows}, nil
}

// build runs the dashboard's reports as the link's owner, with each report's saved filter values.
func (s *IShareServiceImpl) build(ctx context.Context, share *model.DashboardShare) (*dto.PublicDashboardResponse, error) {
	ownerCtx := helper.CtxWithOwnerID(ctx, share.OwnerID)

	dashboard, err := s.dashboardRepo.Find(ownerCtx, share.DashboardID)
	if err != nil {
		return nil, apperror.NotFound(errShareNotFound)
	}

	view := &dto.PublicDashboardResponse{Name: dashboard.Name, GeneratedAt: time.Now(), Cards: []dto.PublicCardResponse{}}

	for i := range dashboard.Cards {
		card := &dashboard.Cards[i]
		question := serviceQuestion.ToResponse(&card.Question)
		out := dto.PublicCardResponse{ID: card.ID, Name: question.Name, Width: card.Width, Chart: question.Chart}

		result, err := s.questionService.Run(ownerCtx, card.QuestionID, question.Params)
		if err != nil {
			// The reason stays in the log: a driver error can name tables and columns.
			s.logger.Warn(fmt.Sprintf("dashboard share %d: report %d failed: %v", share.ID, card.QuestionID, err))
			out.Error = errShareReportFailed.Error()
		} else if out.Result, err = publicResult(result); err != nil {
			s.logger.Warn(fmt.Sprintf("dashboard share %d: report %d result: %v", share.ID, card.QuestionID, err))
			out.Error = errShareReportFailed.Error()
		}

		view.Cards = append(view.Cards, out)
	}

	return view, nil
}
