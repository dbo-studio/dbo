package serviceDashboard

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/config"
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceQuestion "github.com/dbo-studio/dbo/internal/service/question"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cryptoutil"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/samber/lo"
)

const (
	schedulerTick = 15 * time.Second
	// A run later than this when the app starts is a missed one: it is skipped, the next one fires on time.
	missedAfter = 5 * time.Minute
	// A subscription that fails this many times in a row is paused, so it stops hammering a dead address.
	pauseAfterFailures = 5
	maxDuePerTick      = 20
)

var (
	errEmailNotConfigured = errors.New("set up the outgoing email account before scheduling an email")
	errSubscriptionGone   = errors.New("subscription not found")
	errNothingToSend      = errors.New("none of the reports could be run")
)

type ISubscriptionService interface {
	List(ctx context.Context, dashboardID uint) (*dto.DashboardSubscriptionListResponse, error)
	Create(ctx context.Context, dashboardID uint, req *dto.DashboardSubscriptionRequest) (*dto.DashboardSubscriptionResponse, error)
	Update(ctx context.Context, dashboardID, id uint, req *dto.DashboardSubscriptionRequest) (*dto.DashboardSubscriptionResponse, error)
	Delete(ctx context.Context, dashboardID, id uint) error
	// RunNow sends one snapshot now, without moving the schedule; it is how a delivery is tested.
	RunNow(ctx context.Context, dashboardID, id uint) (*dto.DashboardSubscriptionRunResponse, error)
	Runs(ctx context.Context, dashboardID, id uint) ([]dto.DashboardSubscriptionRunResponse, error)
	GetSmtp(ctx context.Context) (*dto.SmtpSettingsResponse, error)
	SaveSmtp(ctx context.Context, req *dto.SmtpSettingsRequest) (*dto.SmtpSettingsResponse, error)
	// Start runs the scheduler until ctx ends. Runs missed while the app was off are skipped.
	Start(ctx context.Context)
}

var _ ISubscriptionService = (*ISubscriptionServiceImpl)(nil)

type ISubscriptionServiceImpl struct {
	subRepo         repository.IDashboardSubscriptionRepo
	dashboardRepo   repository.IDashboardRepo
	questionService serviceQuestion.IQuestionService
	cfg             *config.Config
	cipherKey       []byte
	logger          logger.Logger
}

func NewSubscriptionService(
	subRepo repository.IDashboardSubscriptionRepo,
	dashboardRepo repository.IDashboardRepo,
	questionService serviceQuestion.IQuestionService,
	cfg *config.Config,
	cipherKey []byte,
	logger logger.Logger,
) ISubscriptionService {
	return &ISubscriptionServiceImpl{
		subRepo:         subRepo,
		dashboardRepo:   dashboardRepo,
		questionService: questionService,
		cfg:             cfg,
		cipherKey:       cipherKey,
		logger:          logger,
	}
}

func (s *ISubscriptionServiceImpl) requireBoard(ctx context.Context, dashboardID uint) error {
	if _, err := s.dashboardRepo.Find(ctx, dashboardID); err != nil {
		return apperror.NotFound(errDashboardNotFound)
	}

	return nil
}

func (s *ISubscriptionServiceImpl) find(ctx context.Context, dashboardID, id uint) (*model.DashboardSubscription, error) {
	if err := s.requireBoard(ctx, dashboardID); err != nil {
		return nil, err
	}

	sub, err := s.subRepo.Find(ctx, dashboardID, id)
	if err != nil {
		return nil, apperror.NotFound(errSubscriptionGone)
	}

	return sub, nil
}

func toSubscriptionResponse(sub *model.DashboardSubscription) dto.DashboardSubscriptionResponse {
	return dto.DashboardSubscriptionResponse{
		ID:                  sub.ID,
		Kind:                sub.Kind,
		Target:              sub.Target,
		HasSecret:           sub.SecretEnc != "",
		Frequency:           sub.Frequency,
		Hour:                sub.Hour,
		Minute:              sub.Minute,
		Weekday:             sub.Weekday,
		Timezone:            sub.Timezone,
		Enabled:             sub.Enabled,
		NextRunAt:           sub.NextRunAt,
		LastRunAt:           sub.LastRunAt,
		LastStatus:          sub.LastStatus,
		LastError:           sub.LastError,
		ConsecutiveFailures: sub.ConsecutiveFailures,
	}
}

func (s *ISubscriptionServiceImpl) smtpReady(ctx context.Context) bool {
	settings, err := s.subRepo.GetSmtp(ctx)

	return err == nil && settings.Host != "" && settings.FromAddress != ""
}

func (s *ISubscriptionServiceImpl) List(ctx context.Context, dashboardID uint) (*dto.DashboardSubscriptionListResponse, error) {
	if err := s.requireBoard(ctx, dashboardID); err != nil {
		return nil, err
	}

	subs, err := s.subRepo.List(ctx, dashboardID)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	out := &dto.DashboardSubscriptionListResponse{EmailConfigured: s.smtpReady(ctx), Items: []dto.DashboardSubscriptionResponse{}}
	for i := range subs {
		out.Items = append(out.Items, toSubscriptionResponse(&subs[i]))
	}

	return out, nil
}

// apply copies a request onto a subscription and works out its next run.
func (s *ISubscriptionServiceImpl) apply(sub *model.DashboardSubscription, req *dto.DashboardSubscriptionRequest) error {
	sub.Kind = req.Kind
	sub.Target = strings.Join(lo.If(req.Kind == model.SubscriptionKindEmail, dto.Recipients(req.Target)).Else([]string{strings.TrimSpace(req.Target)}), ", ")
	sub.Frequency = req.Frequency
	sub.Hour, sub.Minute, sub.Weekday = req.Hour, req.Minute, req.Weekday
	sub.Timezone = lo.CoalesceOrEmpty(req.Timezone, "UTC")

	if req.Secret != nil {
		sub.SecretEnc = ""

		if *req.Secret != "" && sub.Kind == model.SubscriptionKindWebhook {
			encrypted, err := cryptoutil.EncryptAESGCM(s.cipherKey, []byte(*req.Secret))
			if err != nil {
				return err
			}

			sub.SecretEnc = encrypted
		}
	}

	if sub.Kind == model.SubscriptionKindEmail {
		sub.SecretEnc = ""
	}

	sub.NextRunAt = nextRun(sub, time.Now())

	return nil
}

func (s *ISubscriptionServiceImpl) Create(ctx context.Context, dashboardID uint, req *dto.DashboardSubscriptionRequest) (*dto.DashboardSubscriptionResponse, error) {
	if err := s.requireBoard(ctx, dashboardID); err != nil {
		return nil, err
	}

	if req.Kind == model.SubscriptionKindEmail && !s.smtpReady(ctx) {
		return nil, apperror.BadRequest(errEmailNotConfigured)
	}

	sub := &model.DashboardSubscription{OwnerID: helper.CtxOwnerID(ctx), DashboardID: dashboardID, Enabled: req.Enabled == nil || *req.Enabled}
	if err := s.apply(sub, req); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	if err := s.subRepo.Create(ctx, sub); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	s.logger.Info(fmt.Sprintf("dashboard subscription %d created for dashboard %d (%s, %s)", sub.ID, dashboardID, sub.Kind, sub.Frequency))

	response := toSubscriptionResponse(sub)

	return &response, nil
}

func (s *ISubscriptionServiceImpl) Update(ctx context.Context, dashboardID, id uint, req *dto.DashboardSubscriptionRequest) (*dto.DashboardSubscriptionResponse, error) {
	sub, err := s.find(ctx, dashboardID, id)
	if err != nil {
		return nil, err
	}

	if req.Kind == model.SubscriptionKindEmail && !s.smtpReady(ctx) {
		return nil, apperror.BadRequest(errEmailNotConfigured)
	}

	if err := s.apply(sub, req); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	if req.Enabled != nil {
		// Turning it back on is a fresh start after a pause.
		if *req.Enabled && !sub.Enabled {
			sub.ConsecutiveFailures = 0
		}

		sub.Enabled = *req.Enabled
	}

	if err := s.subRepo.Save(ctx, sub); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	response := toSubscriptionResponse(sub)

	return &response, nil
}

func (s *ISubscriptionServiceImpl) Delete(ctx context.Context, dashboardID, id uint) error {
	sub, err := s.find(ctx, dashboardID, id)
	if err != nil {
		return err
	}

	if err := s.subRepo.Delete(ctx, sub); err != nil {
		return apperror.InternalServerError(err)
	}

	s.logger.Info(fmt.Sprintf("dashboard subscription %d deleted", id))

	return nil
}

func toRunResponse(run *model.DashboardSubscriptionRun) dto.DashboardSubscriptionRunResponse {
	return dto.DashboardSubscriptionRunResponse{
		ID: run.ID, StartedAt: run.StartedAt, FinishedAt: run.FinishedAt, Status: run.Status,
		Error: run.Error, Reports: run.Reports, Manual: run.Manual,
	}
}

func (s *ISubscriptionServiceImpl) RunNow(ctx context.Context, dashboardID, id uint) (*dto.DashboardSubscriptionRunResponse, error) {
	sub, err := s.find(ctx, dashboardID, id)
	if err != nil {
		return nil, err
	}

	run := s.execute(ctx, sub, true)
	response := toRunResponse(run)

	return &response, nil
}

func (s *ISubscriptionServiceImpl) Runs(ctx context.Context, dashboardID, id uint) ([]dto.DashboardSubscriptionRunResponse, error) {
	if _, err := s.find(ctx, dashboardID, id); err != nil {
		return nil, err
	}

	runs, err := s.subRepo.Runs(ctx, id)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	out := make([]dto.DashboardSubscriptionRunResponse, 0, len(runs))
	for i := range runs {
		out = append(out, toRunResponse(&runs[i]))
	}

	return out, nil
}

// execute sends one snapshot as the subscription's owner and records the outcome. A scheduled run that
// fails counts toward pausing the subscription; a manual one only shows its result.
func (s *ISubscriptionServiceImpl) execute(ctx context.Context, sub *model.DashboardSubscription, manual bool) *model.DashboardSubscriptionRun {
	started := time.Now()
	ownerCtx := helper.CtxWithOwnerID(ctx, sub.OwnerID)

	reports, err := s.deliver(ownerCtx, sub)
	finished := time.Now()

	run := &model.DashboardSubscriptionRun{
		SubscriptionID: sub.ID, StartedAt: started, FinishedAt: finished, Status: model.SubscriptionRunOK, Reports: reports, Manual: manual,
	}

	sub.LastRunAt = &finished
	sub.LastStatus = model.SubscriptionRunOK
	sub.LastError = ""

	if err != nil {
		run.Status, run.Error = model.SubscriptionRunFailed, truncate(err.Error(), 500)
		sub.LastStatus, sub.LastError = run.Status, run.Error
		s.logger.Warn(fmt.Sprintf("dashboard subscription %d failed: %v", sub.ID, err))

		if !manual {
			sub.ConsecutiveFailures++
			if sub.ConsecutiveFailures >= pauseAfterFailures {
				sub.Enabled = false
				s.logger.Warn(fmt.Sprintf("dashboard subscription %d paused after %d failures in a row", sub.ID, sub.ConsecutiveFailures))
			}
		}
	} else if !manual {
		sub.ConsecutiveFailures = 0
	}

	if err := s.subRepo.AddRun(ownerCtx, run); err != nil {
		s.logger.Error(err)
	}

	if err := s.subRepo.SaveResult(ownerCtx, sub); err != nil {
		s.logger.Error(err)
	}

	return run
}

func truncate(text string, limit int) string {
	if len(text) <= limit {
		return text
	}

	return text[:limit]
}

// deliver builds the snapshot and sends it; it returns how many reports made it in.
func (s *ISubscriptionServiceImpl) deliver(ctx context.Context, sub *model.DashboardSubscription) (int, error) {
	dashboard, err := s.dashboardRepo.Find(ctx, sub.DashboardID)
	if err != nil {
		return 0, errors.New("the dashboard no longer exists")
	}

	now := time.Now()
	cards := runCards(ctx, s.questionService, s.logger, fmt.Sprintf("dashboard subscription %d", sub.ID), dashboard)

	if len(cards) > 0 && okCards(cards) == 0 {
		return 0, errNothingToSend
	}

	switch sub.Kind {
	case model.SubscriptionKindEmail:
		settings, err := s.subRepo.GetSmtp(ctx)
		if err != nil || settings.Host == "" || settings.FromAddress == "" {
			return 0, errEmailNotConfigured
		}

		password := ""
		if settings.PasswordEnc != "" {
			plain, err := cryptoutil.DecryptAESGCM(s.cipherKey, settings.PasswordEnc)
			if err != nil {
				return 0, errors.New("the saved email password cannot be read; enter it again in the email settings")
			}

			password = string(plain)
		}

		body, err := summaryHTML(dashboard.Name, now, cards)
		if err != nil {
			return 0, err
		}

		subject := fmt.Sprintf("%s — %s", dashboard.Name, now.Format("2006-01-02 15:04"))
		cfg := smtpConfig{
			Host: settings.Host, Port: settings.Port, Username: settings.Username, Password: password,
			From: settings.FromAddress, Security: settings.Security,
		}

		return okCards(cards), sendMail(cfg, dto.Recipients(sub.Target), subject, body, csvFiles(cards))
	default:
		secret := ""
		if sub.SecretEnc != "" {
			plain, err := cryptoutil.DecryptAESGCM(s.cipherKey, sub.SecretEnc)
			if err != nil {
				return 0, errors.New("the webhook secret cannot be read; set it again")
			}

			secret = string(plain)
		}

		body, err := webhookBody(dashboard.ID, dashboard.Name, now, cards)
		if err != nil {
			return 0, err
		}

		// With sign-in on, other people use this server: keep it from being aimed at its own network.
		// With it off, anyone who reaches the app can already reach whatever its connections reach.
		allowInternal := s.cfg == nil || s.cfg.App.Client == config.ClientDesktop || s.cfg.App.Auth.Mode == config.AuthModeNone

		return okCards(cards), postWebhook(ctx, sub.Target, body, secret, allowInternal)
	}
}

func (s *ISubscriptionServiceImpl) GetSmtp(ctx context.Context) (*dto.SmtpSettingsResponse, error) {
	if err := helper.RequireInstanceAdmin(ctx); err != nil {
		return nil, err
	}

	settings, err := s.subRepo.GetSmtp(ctx)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return smtpResponse(settings), nil
}

func smtpResponse(settings *model.SmtpSettings) *dto.SmtpSettingsResponse {
	return &dto.SmtpSettingsResponse{
		Host: settings.Host, Port: settings.Port, Username: settings.Username, HasPassword: settings.PasswordEnc != "",
		FromAddress: settings.FromAddress, Security: settings.Security, Configured: settings.Host != "" && settings.FromAddress != "",
	}
}

func (s *ISubscriptionServiceImpl) SaveSmtp(ctx context.Context, req *dto.SmtpSettingsRequest) (*dto.SmtpSettingsResponse, error) {
	if err := helper.RequireInstanceAdmin(ctx); err != nil {
		return nil, err
	}

	settings, err := s.subRepo.GetSmtp(ctx)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	settings.Host, settings.Port, settings.Username = strings.TrimSpace(req.Host), req.Port, req.Username
	settings.FromAddress, settings.Security = strings.TrimSpace(req.FromAddress), req.Security

	// An empty password keeps the saved one; the form never receives it back.
	if req.Password != "" {
		encrypted, err := cryptoutil.EncryptAESGCM(s.cipherKey, []byte(req.Password))
		if err != nil {
			return nil, apperror.InternalServerError(err)
		}

		settings.PasswordEnc = encrypted
	}

	if settings.Username == "" {
		settings.PasswordEnc = ""
	}

	if err := s.subRepo.SaveSmtp(ctx, settings); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	s.logger.Info("outgoing email settings updated")

	return smtpResponse(settings), nil
}

func (s *ISubscriptionServiceImpl) Start(ctx context.Context) {
	s.skipMissed(ctx)

	ticker := time.NewTicker(schedulerTick)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.tick(ctx)
		}
	}
}

// skipMissed moves subscriptions that came due while the app was off to their next time, without sending.
func (s *ISubscriptionServiceImpl) skipMissed(ctx context.Context) {
	overdue, err := s.subRepo.Overdue(ctx, time.Now().Add(-missedAfter))
	if err != nil {
		s.logger.Error(err)

		return
	}

	for i := range overdue {
		if err := s.subRepo.SetNextRun(ctx, overdue[i].ID, nextRun(&overdue[i], time.Now())); err != nil {
			s.logger.Error(err)
		}
	}
}

func (s *ISubscriptionServiceImpl) tick(ctx context.Context) {
	due, err := s.subRepo.Due(ctx, time.Now(), maxDuePerTick)
	if err != nil {
		s.logger.Error(err)

		return
	}

	for i := range due {
		if ctx.Err() != nil {
			return
		}

		sub := &due[i]
		// Moved before the run, so a crash or a slow delivery never sends the same slot twice.
		if err := s.subRepo.SetNextRun(ctx, sub.ID, nextRun(sub, time.Now())); err != nil {
			s.logger.Error(err)

			continue
		}

		s.execute(ctx, sub, false)
	}
}
