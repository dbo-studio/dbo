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
	"strconv"
	"strings"
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

const (
	maxViewerParams      = 20
	maxViewerParamLength = 500
)

var (
	errShareUnavailable     = errors.New("share links need DBO running as a server; a desktop app cannot be reached by others")
	errShareNotFound        = errors.New("link not available")
	errShareReportFailed    = errors.New("this report could not be loaded")
	errShareParamTooLong    = errors.New("a filter value is too long")
	errSharePasswordNeeded  = errors.New("share_password_required")
	errSharePasswordInvalid = errors.New("share_password_invalid")
)

type IShareService interface {
	List(ctx context.Context, dashboardID uint) (*dto.DashboardShareListResponse, error)
	// Create makes a link; the response carries the token, the only time it is shown.
	Create(ctx context.Context, dashboardID uint, req *dto.DashboardShareCreateRequest) (*dto.DashboardShareResponse, error)
	Update(ctx context.Context, dashboardID, shareID uint, req *dto.DashboardShareUpdateRequest) (*dto.DashboardShareResponse, error)
	Revoke(ctx context.Context, dashboardID, shareID uint) (*dto.DashboardShareResponse, error)
	// Visits is the link's log: when it was opened and how it went.
	Visits(ctx context.Context, dashboardID, shareID uint) ([]dto.DashboardShareVisitResponse, error)
	// View is the public side: the dashboard of a link with every report run on the owner's connection.
	// params only count when the link allows filters; ip is for the link's visit log.
	View(ctx context.Context, token, password string, params map[string]string, ip string) (*dto.PublicDashboardResponse, error)
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
	cache map[string]cachedView
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
		cache:           map[string]cachedView{},
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
		AllowFilters: share.AllowFilters,
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
		AllowFilters: req.AllowFilters,
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

	if req.AllowFilters != nil {
		share.AllowFilters = *req.AllowFilters
		s.dropCached(share.ID)
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

	s.dropCached(share.ID)

	response := toShareResponse(share)

	return &response, nil
}

// dropCached forgets every stored answer of a link.
func (s *IShareServiceImpl) dropCached(shareID uint) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for key := range s.cache {
		if strings.HasPrefix(key, strconv.FormatUint(uint64(shareID), 10)+"|") {
			delete(s.cache, key)
		}
	}
}

func (s *IShareServiceImpl) Visits(ctx context.Context, dashboardID, shareID uint) ([]dto.DashboardShareVisitResponse, error) {
	if _, err := s.find(ctx, dashboardID, shareID); err != nil {
		return nil, err
	}

	visits, err := s.shareRepo.Visits(ctx, shareID, 50)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	out := make([]dto.DashboardShareVisitResponse, 0, len(visits))
	for _, visit := range visits {
		out = append(out, dto.DashboardShareVisitResponse{ViewedAt: visit.ViewedAt, Outcome: visit.Outcome, IP: visit.IP})
	}

	return out, nil
}

func (s *IShareServiceImpl) visit(ctx context.Context, shareID uint, outcome, ip string) {
	if err := s.shareRepo.AddVisit(ctx, &model.DashboardShareView{ShareID: shareID, ViewedAt: time.Now(), Outcome: outcome, IP: ip}); err != nil {
		s.logger.Error(err)
	}
}

func shareAuthError(err error, message string) error {
	return &apperror.AppError{Code: http.StatusUnauthorized, Message: message, Err: err}
}

func (s *IShareServiceImpl) View(ctx context.Context, token, password string, params map[string]string, ip string) (*dto.PublicDashboardResponse, error) {
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
			s.visit(ctx, share.ID, model.ShareViewPasswordRequired, ip)

			return nil, shareAuthError(errSharePasswordNeeded, "share_password_required")
		}

		if bcrypt.CompareHashAndPassword([]byte(share.PasswordHash), []byte(password)) != nil {
			s.logger.Warn(fmt.Sprintf("dashboard share %d: wrong password", share.ID))
			s.visit(ctx, share.ID, model.ShareViewWrongPassword, ip)

			return nil, shareAuthError(errSharePasswordInvalid, "share_password_invalid")
		}
	}

	// A viewer's values count only where the link allows them, and only a few, so a link is not a way to
	// make the database work on arbitrary input.
	if !share.AllowFilters || len(params) > maxViewerParams {
		params = nil
	}

	for name, value := range params {
		if len(value) > maxViewerParamLength || len(name) > 100 {
			return nil, apperror.BadRequest(errShareParamTooLong)
		}
	}

	if err := s.shareRepo.RecordView(ctx, share.ID); err != nil {
		s.logger.Error(err)
	}

	s.visit(ctx, share.ID, model.ShareViewOK, ip)

	key := cacheKey(share.ID, params)

	s.mu.Lock()
	hit, cached := s.cache[key]
	s.mu.Unlock()

	if cached && time.Since(hit.at) < publicResultTTL {
		return hit.view, nil
	}

	view, err := s.build(ctx, share, params)
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	s.evictExpired()
	s.cache[key] = cachedView{at: time.Now(), view: view}
	s.mu.Unlock()

	return view, nil
}

// cacheKey names one answer: the link and the values it was asked with.
func cacheKey(shareID uint, params map[string]string) string {
	encoded, _ := json.Marshal(params) // map keys are sorted, so equal values give an equal key

	sum := sha256.Sum256(encoded)

	return strconv.FormatUint(uint64(shareID), 10) + "|" + hex.EncodeToString(sum[:8])
}

// evictExpired keeps the answers of viewer-chosen filters from piling up; s.mu is held.
func (s *IShareServiceImpl) evictExpired() {
	for key, entry := range s.cache {
		if time.Since(entry.at) >= publicResultTTL {
			delete(s.cache, key)
		}
	}
}

// build runs the dashboard's reports as the link's owner. Each report uses its saved filter values, and where the
// link allows it the viewer's value for a filter of the same name.
func (s *IShareServiceImpl) build(ctx context.Context, share *model.DashboardShare, params map[string]string) (*dto.PublicDashboardResponse, error) {
	ownerCtx := helper.CtxWithOwnerID(ctx, share.OwnerID)

	dashboard, err := s.dashboardRepo.Find(ownerCtx, share.DashboardID)
	if err != nil {
		return nil, apperror.NotFound(errShareNotFound)
	}

	view := &dto.PublicDashboardResponse{
		Name:        dashboard.Name,
		GeneratedAt: time.Now(),
		Filters:     []dto.PublicFilter{},
		Cards:       runCards(ownerCtx, s.questionService, s.logger, fmt.Sprintf("dashboard share %d", share.ID), dashboard, params),
	}

	if share.AllowFilters {
		view.Filters = sharedFilters(dashboard, params)
	}

	return view, nil
}

// sharedFilters is the filter bar of a shared page: every filter of every report, once by name, starting from the
// viewer's value, else a report's saved one.
func sharedFilters(dashboard *model.Dashboard, params map[string]string) []dto.PublicFilter {
	filters := []dto.PublicFilter{}
	seen := map[string]bool{}

	for i := range dashboard.Cards {
		saved := serviceQuestion.ToResponse(&dashboard.Cards[i].Question).Params

		for _, decl := range serviceQuestion.Declared(dashboard.Cards[i].Question.SQL) {
			if seen[decl.Name] {
				continue
			}

			seen[decl.Name] = true
			filters = append(filters, dto.PublicFilter{
				Name: decl.Name, Type: lo.CoalesceOrEmpty(decl.Type, "text"),
				Value: lo.CoalesceOrEmpty(params[decl.Name], saved[decl.Name]),
			})
		}
	}

	return filters
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

// mergeParams puts a viewer's values over a report's saved ones, for the filters the report has.
func mergeParams(saved, overrides map[string]string) map[string]string {
	if len(overrides) == 0 {
		return saved
	}

	merged := make(map[string]string, len(saved))
	for name, value := range saved {
		merged[name] = value
	}

	// A value the viewer cleared stays cleared: a field filter then means "any".
	for name, value := range overrides {
		merged[name] = value
	}

	return merged
}

// runCards runs each report of a dashboard as the owner in ctx, with its saved filter values, and keeps
// what may leave the app: rows and column names, never the SQL. A failed report becomes a card with a generic
// message; the reason stays in the log, since a driver error can name tables and columns.
func runCards(ctx context.Context, questions serviceQuestion.IQuestionService, log logger.Logger, label string, dashboard *model.Dashboard, overrides map[string]string) []dto.PublicCardResponse {
	cards := []dto.PublicCardResponse{}

	for i := range dashboard.Cards {
		card := &dashboard.Cards[i]
		question := serviceQuestion.ToResponse(&card.Question)
		out := dto.PublicCardResponse{ID: card.ID, Name: question.Name, Width: card.Width, Chart: question.Chart}

		result, err := questions.Run(ctx, card.QuestionID, mergeParams(question.Params, overrides))
		if err != nil {
			log.Warn(fmt.Sprintf("%s: report %d failed: %v", label, card.QuestionID, err))
			out.Error = errShareReportFailed.Error()
		} else if out.Result, err = publicResult(result); err != nil {
			log.Warn(fmt.Sprintf("%s: report %d result: %v", label, card.QuestionID, err))
			out.Error = errShareReportFailed.Error()
		}

		cards = append(cards, out)
	}

	return cards
}
