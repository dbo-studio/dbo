package serviceBackup

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceJob "github.com/dbo-studio/dbo/internal/service/job"
	serviceSecretStore "github.com/dbo-studio/dbo/internal/service/secret_store"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

var ErrScheduleNotFound = errors.New("backup schedule not found")

type IBackupScheduleService interface {
	List(ctx context.Context) ([]dto.BackupScheduleResponse, error)
	Create(ctx context.Context, req *dto.BackupScheduleRequest) (*dto.BackupScheduleResponse, error)
	Update(ctx context.Context, req *dto.BackupScheduleUpdateRequest) (*dto.BackupScheduleResponse, error)
	Delete(ctx context.Context, req *dto.BackupScheduleIDRequest) error
	Run(ctx context.Context, req *dto.BackupScheduleIDRequest) (*dto.BackupResponse, error)
}

type IBackupScheduleServiceImpl struct {
	jobManager     serviceJob.IJobManager
	connectionRepo repository.IConnectionRepo
	shareRepo      repository.IConnectionShareRepo
	scheduleRepo   repository.IBackupScheduleRepo
	connectorRepo  repository.IBackupConnectorRepo
	secrets        serviceSecretStore.ISecretStore
}

func NewBackupScheduleService(jobManager serviceJob.IJobManager, connectionRepo repository.IConnectionRepo, shareRepo repository.IConnectionShareRepo, scheduleRepo repository.IBackupScheduleRepo, connectorRepo repository.IBackupConnectorRepo, secrets serviceSecretStore.ISecretStore) IBackupScheduleService {
	return &IBackupScheduleServiceImpl{
		jobManager:     jobManager,
		connectionRepo: connectionRepo,
		shareRepo:      shareRepo,
		scheduleRepo:   scheduleRepo,
		connectorRepo:  connectorRepo,
		secrets:        secrets,
	}
}

func (s IBackupScheduleServiceImpl) List(ctx context.Context) ([]dto.BackupScheduleResponse, error) {
	schedules, err := s.scheduleRepo.ListByOwner(ctx, helper.CtxOwnerID(ctx))
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return lo.Map(schedules, func(sc model.BackupSchedule, _ int) dto.BackupScheduleResponse {
		return s.response(ctx, sc)
	}), nil
}

func (s IBackupScheduleServiceImpl) Create(ctx context.Context, req *dto.BackupScheduleRequest) (*dto.BackupScheduleResponse, error) {
	ownerID := helper.CtxOwnerID(ctx)

	if err := s.requireWrite(ctx, req.ConnectionID, ownerID); err != nil {
		return nil, err
	}

	schedule := &model.BackupSchedule{
		OwnerID:       ownerID,
		ConnectionID:  uint(req.ConnectionID),
		Name:          req.Name,
		Database:      req.Database,
		Schema:        req.Schema,
		Cadence:       req.Cadence,
		Hour:          req.Hour,
		Minute:        req.Minute,
		Weekday:       req.Weekday,
		Timezone:      lo.CoalesceOrEmpty(req.Timezone, "UTC"),
		Enabled:       true,
		KeepLast:      req.KeepLast,
		KeepDays:      req.KeepDays,
		KeepSmart:     req.KeepSmart,
		Compress:      req.Compress,
		DestinationID: req.DestinationID,
		ChannelIDs:    channelIDsJSON(req.ChannelIDs),
		NotifyOn:      lo.CoalesceOrEmpty(req.NotifyOn, "failure"),
	}

	if err := s.checkConnectors(ctx, ownerID, req.DestinationID, req.ChannelIDs); err != nil {
		return nil, err
	}

	if req.Passphrase != "" {
		if err := setEncryption(schedule, req.Passphrase); err != nil {
			return nil, apperror.InternalServerError(err)
		}
	}

	next, err := NextRun(schedule, time.Now())
	if err != nil {
		return nil, apperror.Validation(errors.New("timezone: unknown time zone"))
	}

	schedule.NextRunAt = &next

	if err := s.scheduleRepo.Create(ctx, schedule); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	res := s.response(ctx, *schedule)

	return &res, nil
}

func (s IBackupScheduleServiceImpl) Update(ctx context.Context, req *dto.BackupScheduleUpdateRequest) (*dto.BackupScheduleResponse, error) {
	ownerID := helper.CtxOwnerID(ctx)

	schedule, err := s.scheduleRepo.FindByOwner(ctx, req.ID, ownerID)
	if err != nil {
		return nil, apperror.NotFound(ErrScheduleNotFound)
	}

	if err := s.requireWrite(ctx, int32(schedule.ConnectionID), ownerID); err != nil {
		return nil, err
	}

	applyScheduleUpdate(schedule, req)

	if err := s.checkConnectors(ctx, ownerID, schedule.DestinationID, schedule.Channels()); err != nil {
		return nil, err
	}

	// A new passphrase means a new key pair; backups already made keep the key
	// they were written with.
	if req.Passphrase != nil && *req.Passphrase != "" {
		if err := setEncryption(schedule, *req.Passphrase); err != nil {
			return nil, apperror.InternalServerError(err)
		}
	}

	fields := map[string]any{
		"name": schedule.Name, "database": schedule.Database, "schema": schedule.Schema,
		"cadence": schedule.Cadence, "hour": schedule.Hour, "minute": schedule.Minute,
		"weekday": schedule.Weekday, "timezone": schedule.Timezone, "enabled": schedule.Enabled,
		"keep_last": schedule.KeepLast, "keep_days": schedule.KeepDays, "keep_smart": schedule.KeepSmart, "compress": schedule.Compress, "public_key": schedule.PublicKey, "wrapped_key": schedule.WrappedKey,
		"destination_id": schedule.DestinationID, "channel_ids": schedule.ChannelIDs, "notify_on": schedule.NotifyOn,
	}

	// Timing or enabling changes recompute the next run from now.
	next, err := NextRun(schedule, time.Now())
	if err != nil {
		return nil, apperror.Validation(errors.New("timezone: unknown time zone"))
	}

	schedule.NextRunAt = &next
	fields["next_run_at"] = next

	if err := s.scheduleRepo.UpdateFields(ctx, schedule.ID, fields); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	res := s.response(ctx, *schedule)

	return &res, nil
}

func (s IBackupScheduleServiceImpl) Delete(ctx context.Context, req *dto.BackupScheduleIDRequest) error {
	ownerID := helper.CtxOwnerID(ctx)

	schedule, err := s.scheduleRepo.FindByOwner(ctx, req.ID, ownerID)
	if err != nil {
		return apperror.NotFound(ErrScheduleNotFound)
	}

	if err := s.requireWrite(ctx, int32(schedule.ConnectionID), ownerID); err != nil {
		return err
	}

	// Existing backups stay: deleting a schedule must never delete data.
	if err := s.scheduleRepo.Delete(ctx, schedule.ID); err != nil {
		return apperror.InternalServerError(err)
	}

	return nil
}

// Run queues a backup for the schedule now, without moving its next run.
func (s IBackupScheduleServiceImpl) Run(ctx context.Context, req *dto.BackupScheduleIDRequest) (*dto.BackupResponse, error) {
	ownerID := helper.CtxOwnerID(ctx)

	schedule, err := s.scheduleRepo.FindByOwner(ctx, req.ID, ownerID)
	if err != nil {
		return nil, apperror.NotFound(ErrScheduleNotFound)
	}

	if err := s.requireWrite(ctx, int32(schedule.ConnectionID), ownerID); err != nil {
		return nil, err
	}

	job, err := queueScheduledBackup(ctx, s.jobManager, s.scheduleRepo, schedule)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return &dto.BackupResponse{JobID: int32(job.ID)}, nil
}

// requireWrite lets only the connection's owner or an editor schedule backups.
func (s IBackupScheduleServiceImpl) requireWrite(ctx context.Context, connectionID int32, ownerID string) error {
	connection, err := s.connectionRepo.Find(ctx, connectionID)
	if err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	if connection.OwnerID == ownerID {
		return nil
	}

	share, err := s.shareRepo.Find(ctx, connection.ID, ownerID)
	if err != nil || share.Role != model.ConnectionShareEditor {
		return apperror.Forbidden(apperror.ErrConnectionEditForbidden)
	}

	return nil
}

func applyScheduleUpdate(s *model.BackupSchedule, req *dto.BackupScheduleUpdateRequest) {
	s.Enabled = lo.FromPtrOr(req.Enabled, s.Enabled)
	s.Name = lo.FromPtrOr(req.Name, s.Name)
	s.Database = lo.FromPtrOr(req.Database, s.Database)
	s.Schema = lo.FromPtrOr(req.Schema, s.Schema)
	s.Cadence = lo.FromPtrOr(req.Cadence, s.Cadence)
	s.Hour = lo.FromPtrOr(req.Hour, s.Hour)
	s.Minute = lo.FromPtrOr(req.Minute, s.Minute)
	s.Weekday = lo.FromPtrOr(req.Weekday, s.Weekday)
	s.Timezone = strings.TrimSpace(lo.FromPtrOr(req.Timezone, s.Timezone))
	s.KeepLast = lo.FromPtrOr(req.KeepLast, s.KeepLast)
	s.KeepDays = lo.FromPtrOr(req.KeepDays, s.KeepDays)
	s.KeepSmart = lo.FromPtrOr(req.KeepSmart, s.KeepSmart)
	s.Compress = lo.FromPtrOr(req.Compress, s.Compress)
	s.DestinationID = lo.FromPtrOr(req.DestinationID, s.DestinationID)
	s.NotifyOn = lo.FromPtrOr(req.NotifyOn, s.NotifyOn)

	if req.ChannelIDs != nil {
		s.ChannelIDs = channelIDsJSON(*req.ChannelIDs)
	}
}

func channelIDsJSON(ids []uint) string {
	raw, _ := json.Marshal(lo.Uniq(ids))

	return string(raw)
}

// checkConnectors makes sure the destination and channels belong to the caller,
// so a schedule cannot point at someone else's storage.
func (s IBackupScheduleServiceImpl) checkConnectors(ctx context.Context, ownerID string, destinationID uint, channelIDs []uint) error {
	if destinationID != 0 {
		if c, err := s.connectorRepo.FindByOwner(ctx, destinationID, ownerID); err != nil || c.Kind != model.ConnectorKindDestination {
			return apperror.Validation(errors.New("destinationId: unknown destination"))
		}
	}

	for _, id := range channelIDs {
		if c, err := s.connectorRepo.FindByOwner(ctx, id, ownerID); err != nil || c.Kind != model.ConnectorKindChannel {
			return apperror.Validation(errors.New("channelIds: unknown channel"))
		}
	}

	return nil
}

// response maps a schedule and reports whether a run can authenticate without
// the owner present.
func (s IBackupScheduleServiceImpl) response(ctx context.Context, sc model.BackupSchedule) dto.BackupScheduleResponse {
	res := scheduleResponse(sc)
	res.PasswordRemembered = s.passwordRemembered(ctx, sc)

	return res
}

// passwordRemembered is true for SQLite (no password) and for connections whose
// password is stored persistently rather than for a session.
func (s IBackupScheduleServiceImpl) passwordRemembered(ctx context.Context, sc model.BackupSchedule) bool {
	connection, err := s.connectionRepo.Find(ctx, int32(sc.ConnectionID))
	if err != nil {
		return false
	}

	if connection.ConnectionType == "sqlite" {
		return true
	}

	if _, err := s.secrets.GetConnectionPassword(ctx, sc.OwnerID, sc.ConnectionID); err != nil {
		return false
	}

	temporary, err := s.secrets.IsTemporaryConnectionPassword(ctx, sc.OwnerID, sc.ConnectionID)

	return err == nil && !temporary
}

func scheduleResponse(s model.BackupSchedule) dto.BackupScheduleResponse {
	return dto.BackupScheduleResponse{
		ID: s.ID, ConnectionID: s.ConnectionID, Name: s.Name, Database: s.Database, Schema: s.Schema,
		Cadence: s.Cadence, Hour: s.Hour, Minute: s.Minute, Weekday: s.Weekday, Timezone: s.Timezone,
		Enabled: s.Enabled, KeepLast: s.KeepLast, KeepDays: s.KeepDays, KeepSmart: s.KeepSmart, Compress: s.Compress, Encrypted: s.PublicKey != "",
		DestinationID: s.DestinationID, ChannelIDs: s.Channels(), NotifyOn: s.NotifyOn,
		NextRunAt: s.NextRunAt, LastRunAt: s.LastRunAt, LastSuccessAt: s.LastSuccessAt, LastSize: s.LastSize, LastStatus: s.LastStatus, LastError: s.LastError,
	}
}

// queueScheduledBackup creates the backup job for a schedule and records the
// run on it. The job carries ids only, like a manual backup.
func queueScheduledBackup(ctx context.Context, jobs serviceJob.IJobManager, repo repository.IBackupScheduleRepo, s *model.BackupSchedule) (*model.Job, error) {
	job, err := jobs.CreateJob(model.JobTypeBackup, s.OwnerID, helper.StructToJSON(dto.BackupJob{
		OwnerID: s.OwnerID,
		BackupRequest: dto.BackupRequest{
			ConnectionID:  int32(s.ConnectionID),
			Database:      s.Database,
			Schema:        s.Schema,
			Note:          "Schedule: " + s.Name,
			Compress:      s.Compress,
			DestinationID: s.DestinationID,
		},
		ChannelIDs: s.Channels(),
		NotifyOn:   s.NotifyOn,
		ScheduleID: s.ID,
		PublicKey:  s.PublicKey,
		WrappedKey: s.WrappedKey,
	}))
	if err != nil {
		return nil, err
	}

	now := time.Now()

	err = repo.UpdateFields(ctx, s.ID, map[string]any{
		"last_run_at": now, "last_job_id": job.ID, "last_status": "running", "last_error": "",
	})

	return job, err
}

// setEncryption replaces a schedule's key pair with one wrapped by passphrase.
func setEncryption(s *model.BackupSchedule, passphrase string) error {
	enc, err := NewEncryption(passphrase)
	if err != nil {
		return err
	}

	s.PublicKey = hex.EncodeToString(enc.PublicKey)
	s.WrappedKey = hex.EncodeToString(enc.WrappedKey)

	return nil
}
