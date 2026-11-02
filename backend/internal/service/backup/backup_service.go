package serviceBackup

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceJob "github.com/dbo-studio/dbo/internal/service/job"
	serviceSafemode "github.com/dbo-studio/dbo/internal/service/safemode"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/dbo-studio/dbo/pkg/sqlguard"
	"github.com/samber/lo"
)

type IBackupService interface {
	Create(ctx context.Context, req *dto.BackupRequest) (*dto.BackupResponse, error)
	Restore(ctx context.Context, req *dto.RestoreRequest) (*dto.RestoreResponse, error)
	Upload(ctx context.Context, req *dto.BackupUploadRequest) (*dto.BackupArtifactResponse, error)
	History(ctx context.Context, req *dto.BackupHistoryRequest) ([]dto.BackupArtifactResponse, error)
	Download(ctx context.Context, req *dto.BackupDownloadRequest) (*response.FileDownload, error)
	Verify(ctx context.Context, req *dto.BackupVerifyRequest) (*dto.BackupVerifyResponse, error)
	Tools(ctx context.Context) []dto.BackupTool
	ToolDownloads(ctx context.Context) ([]dto.BackupToolDownload, error)
	InstallTool(ctx context.Context, req *dto.ToolInstallRequest) (*dto.ToolInstallResponse, error)
	RemoveTool(ctx context.Context, req *dto.ToolRemoveRequest) error
}

type IBackupServiceImpl struct {
	jobManager     serviceJob.IJobManager
	connectionRepo repository.IConnectionRepo
	shareRepo      repository.IConnectionShareRepo
	artifactRepo   repository.IBackupArtifactRepo
	unlockStore    *serviceSafemode.UnlockStore
}

func NewBackupService(jobManager serviceJob.IJobManager, connectionRepo repository.IConnectionRepo, shareRepo repository.IConnectionShareRepo, artifactRepo repository.IBackupArtifactRepo, appCache cache.Cache) IBackupService {
	return &IBackupServiceImpl{
		jobManager:     jobManager,
		connectionRepo: connectionRepo,
		shareRepo:      shareRepo,
		artifactRepo:   artifactRepo,
		unlockStore:    serviceSafemode.NewUnlockStore(appCache),
	}
}

// Create queues a backup job. Backups only read, so Safe Mode does not gate
// them. The job data holds ids only, never credentials.
func (s IBackupServiceImpl) Create(ctx context.Context, req *dto.BackupRequest) (*dto.BackupResponse, error) {
	if _, err := s.connectionRepo.Find(ctx, req.ConnectionID); err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	ownerID := helper.CtxOwnerID(ctx)

	jobData := dto.BackupJob{OwnerID: ownerID, BackupRequest: *req}
	jobData.Passphrase = ""

	// The passphrase becomes key material here and is dropped: the job, its
	// row and the logs never see it.
	if req.Passphrase != "" {
		enc, err := NewEncryption(req.Passphrase)
		if err != nil {
			return nil, apperror.InternalServerError(err)
		}

		jobData.PublicKey = hex.EncodeToString(enc.PublicKey)
		jobData.WrappedKey = hex.EncodeToString(enc.WrappedKey)
	}

	job, err := s.jobManager.CreateJob(model.JobTypeBackup, ownerID, helper.StructToJSON(jobData))
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return &dto.BackupResponse{JobID: int32(job.ID)}, nil
}

// Restore queues a restore job after the typed confirmation and Safe Mode
// check. A restore overwrites data, so it is classified like destructive DDL.
func (s IBackupServiceImpl) Restore(ctx context.Context, req *dto.RestoreRequest) (*dto.RestoreResponse, error) {
	connection, err := s.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	ownerID := helper.CtxOwnerID(ctx)

	if !s.canWrite(ctx, connection, ownerID) {
		return nil, apperror.Forbidden(apperror.ErrConnectionEditForbidden)
	}

	artifact, err := s.artifactRepo.FindByOwner(ctx, req.ArtifactID, ownerID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrBackupNotFound)
	}

	if artifact.Status != model.BackupStatusCompleted {
		return nil, apperror.BadRequest(apperror.ErrBackupNotCompleted)
	}

	if familyOf(artifact.Driver) != familyOf(connection.ConnectionType) {
		return nil, apperror.BadRequest(apperror.ErrRestoreDriverMismatch)
	}

	if artifact.Encrypted && req.Passphrase == "" {
		return nil, apperror.BadRequest(ErrNeedPassphrase)
	}

	if req.ConfirmName != req.Database {
		return nil, apperror.BadRequest(apperror.ErrRestoreConfirmMismatch)
	}

	policy := s.unlockStore.WithUnlock(ctx, ownerID, connection.ID, serviceSafemode.FromConnection(connection))
	// The typed name is the confirmation, but only an unlock lifts the
	// password-gated Safe Mode levels.
	if err := serviceSafemode.Enforce(policy, sqlguard.ClassCatastrophicDDL, true); err != nil {
		return nil, err
	}

	s.unlockStore.ConsumeGate(ctx, ownerID, connection.ID, policy.Unlocked)

	// Jobs run oldest first, so the safety backup finishes before the restore
	// starts; the restore checks that it succeeded.
	var safetyJobID uint

	// A database that does not exist yet has nothing to back up.
	if req.SafetyBackup && !req.CreateDatabase {
		safety, err := s.jobManager.CreateJob(model.JobTypeBackup, ownerID, helper.StructToJSON(dto.BackupJob{
			OwnerID: ownerID,
			BackupRequest: dto.BackupRequest{
				ConnectionID: req.ConnectionID,
				Database:     req.Database,
				Schema:       req.Schema,
				Note:         "Safety copy before restore",
			},
		}))
		if err != nil {
			return nil, apperror.InternalServerError(err)
		}

		safetyJobID = safety.ID
	}

	job, err := s.jobManager.CreateJob(model.JobTypeRestore, ownerID, helper.StructToJSON(dto.RestoreJob{
		OwnerID:        ownerID,
		RestoreRequest: withoutPassphrase(*req),
		SafetyJobID:    safetyJobID,
	}))
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	if req.Passphrase != "" {
		StashPassphrase(job.ID, req.Passphrase)
	}

	return &dto.RestoreResponse{JobID: int32(job.ID)}, nil
}

func (s IBackupServiceImpl) History(ctx context.Context, req *dto.BackupHistoryRequest) ([]dto.BackupArtifactResponse, error) {
	artifacts, err := s.artifactRepo.ListByOwner(ctx, helper.CtxOwnerID(ctx), req.ConnectionID)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	if req.ScheduleID != nil {
		artifacts = lo.Filter(artifacts, func(a model.BackupArtifact, _ int) bool { return a.ScheduleID == *req.ScheduleID })
	}

	return lo.Map(artifacts, func(a model.BackupArtifact, _ int) dto.BackupArtifactResponse {
		return artifactResponse(a)
	}), nil
}

func (s IBackupServiceImpl) Download(ctx context.Context, req *dto.BackupDownloadRequest) (*response.FileDownload, error) {
	artifact, err := s.artifactRepo.FindByOwner(ctx, req.ID, helper.CtxOwnerID(ctx))
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrBackupNotFound)
	}

	if artifact.Status != model.BackupStatusCompleted {
		return nil, apperror.BadRequest(apperror.ErrBackupNotCompleted)
	}

	if !helper.IsReadableBackupPath(artifact.FilePath) {
		return nil, apperror.BadRequest(apperror.ErrInvalidSavePath)
	}

	content, err := os.ReadFile(artifact.FilePath)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrBackupNotFound)
	}

	contentType := "application/octet-stream"
	if filepath.Ext(artifact.FileName) == ".sql" {
		contentType = "application/sql"
	}

	return &response.FileDownload{
		FileName:    artifact.FileName,
		ContentType: contentType,
		Content:     content,
	}, nil
}

func (s IBackupServiceImpl) Tools(ctx context.Context) []dto.BackupTool {
	return DetectTools(ctx)
}

func (s IBackupServiceImpl) ToolDownloads(_ context.Context) ([]dto.BackupToolDownload, error) {
	downloads, err := ToolDownloads()
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return downloads, nil
}

// InstallTool queues a download of one pinned tool. Tools are host-wide, so
// signed-in users need the admin role.
func (s IBackupServiceImpl) InstallTool(ctx context.Context, req *dto.ToolInstallRequest) (*dto.ToolInstallResponse, error) {
	if err := helper.RequireInstanceAdmin(ctx); err != nil {
		return nil, err
	}

	downloads, err := s.ToolDownloads(ctx)
	if err != nil {
		return nil, err
	}

	if !lo.ContainsBy(downloads, func(d dto.BackupToolDownload) bool {
		return d.Driver == req.Driver && d.Version == req.Version
	}) {
		return nil, apperror.BadRequest(ErrToolNotInManifest)
	}

	job, err := s.jobManager.CreateJob(model.JobTypeToolInstall, helper.CtxOwnerID(ctx), helper.StructToJSON(dto.ToolInstallJob{ToolInstallRequest: *req}))
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return &dto.ToolInstallResponse{JobID: int32(job.ID)}, nil
}

func (s IBackupServiceImpl) RemoveTool(ctx context.Context, req *dto.ToolRemoveRequest) error {
	if err := helper.RequireInstanceAdmin(ctx); err != nil {
		return err
	}

	if err := RemoveTool(req.Driver, req.Version); err != nil {
		return apperror.NotFound(err)
	}

	return nil
}

// familyOf groups driver names that share a dump format, e.g. rds_mysql and
// mysql.
func familyOf(driver string) string {
	switch {
	case databaseContract.IsPostgresFamily(driver):
		return databaseContract.Postgresql
	case databaseContract.IsMysqlFamily(driver):
		return databaseContract.Mysql
	default:
		return driver
	}
}

// Upload stores a backup file the user brought, so it can be restored like any
// recorded backup. The file type must match the connection's driver.
func (s IBackupServiceImpl) Upload(ctx context.Context, req *dto.BackupUploadRequest) (*dto.BackupArtifactResponse, error) {
	connection, err := s.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	ext := strings.ToLower(filepath.Ext(req.File.Filename))
	if (ext != ".sql" && ext != ".sqlite") || (ext == ".sqlite") != (connection.ConnectionType == databaseContract.Sqlite) {
		return nil, apperror.BadRequest(apperror.ErrBackupFileType)
	}

	if req.File.Size > helper.MaxUploadSize {
		return nil, apperror.BadRequest(apperror.ErrBackupFileTooLarge)
	}

	now := time.Now()
	artifact := &model.BackupArtifact{
		OwnerID:      helper.CtxOwnerID(ctx),
		ConnectionID: connection.ID,
		Driver:       connection.ConnectionType,
		Method:       model.BackupMethodUploaded,
		Status:       model.BackupStatusRunning,
		Note:         req.Note,
		FileName:     "upload" + ext,
		StartedAt:    now,
	}

	if err := s.artifactRepo.Create(ctx, artifact); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	// The name on disk never comes from the client.
	if err := helper.EnsureBackupDir(); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	path := filepath.Join(helper.BackupDir, fmt.Sprintf("%d_%s", artifact.ID, artifact.FileName))

	size, checksum, err := saveUpload(req.File, path)
	if err != nil {
		_ = os.Remove(path)
		_ = s.artifactRepo.UpdateFields(ctx, artifact.ID, map[string]any{"status": model.BackupStatusFailed, "error": err.Error(), "completed_at": now})

		return nil, apperror.InternalServerError(err)
	}

	if err := s.artifactRepo.UpdateFields(ctx, artifact.ID, map[string]any{
		"status": model.BackupStatusCompleted, "file_path": path, "size": size, "checksum": checksum, "completed_at": now,
	}); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	done, err := s.artifactRepo.FindByOwner(ctx, artifact.ID, artifact.OwnerID)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	res := artifactResponse(*done)

	return &res, nil
}

func saveUpload(header *multipart.FileHeader, dest string) (int64, string, error) {
	in, err := header.Open()
	if err != nil {
		return 0, "", err
	}

	defer func() { _ = in.Close() }()

	out, err := os.OpenFile(dest, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		return 0, "", err
	}

	h := sha256.New()

	size, err := io.Copy(io.MultiWriter(out, h), io.LimitReader(in, helper.MaxUploadSize+1))
	if closeErr := out.Close(); err == nil {
		err = closeErr
	}

	if err != nil {
		return 0, "", err
	}

	if size > helper.MaxUploadSize {
		return 0, "", apperror.ErrBackupFileTooLarge
	}

	return size, hex.EncodeToString(h.Sum(nil)), nil
}

func artifactResponse(a model.BackupArtifact) dto.BackupArtifactResponse {
	return dto.BackupArtifactResponse{
		ID:           a.ID,
		ConnectionID: a.ConnectionID,
		JobID:        a.JobID,
		ScheduleID:   a.ScheduleID,
		Database:     a.Database,
		Schema:       a.Schema,
		Driver:       a.Driver,
		Method:       string(a.Method),
		Log:          a.Log,
		Compressed:   a.Compressed,
		Encrypted:    a.Encrypted,
		Tool:         a.Tool,
		ToolVersion:  a.ToolVersion,
		Status:       string(a.Status),
		Note:         a.Note,
		FileName:     a.FileName,
		Size:         a.Size,
		Checksum:     a.Checksum,
		Error:        a.Error,
		StartedAt:    a.StartedAt,
		CompletedAt:  a.CompletedAt,
	}
}

// canWrite reports whether the caller may overwrite data on the connection:
// its owner or an editor share. Viewers can back up but not restore.
func (s IBackupServiceImpl) canWrite(ctx context.Context, connection *model.Connection, ownerID string) bool {
	if connection.OwnerID == ownerID {
		return true
	}

	share, err := s.shareRepo.Find(ctx, connection.ID, ownerID)

	return err == nil && share.Role == model.ConnectionShareEditor
}

// withoutPassphrase keeps the passphrase out of the job row.
func withoutPassphrase(req dto.RestoreRequest) dto.RestoreRequest {
	req.Passphrase = ""

	return req
}

// Verify checks that a backup file is intact: its checksum matches the one
// recorded when it was made and, when it is compressed or the passphrase is
// given, that it reads back completely.
func (s IBackupServiceImpl) Verify(ctx context.Context, req *dto.BackupVerifyRequest) (*dto.BackupVerifyResponse, error) {
	artifact, err := s.artifactRepo.FindByOwner(ctx, req.ID, helper.CtxOwnerID(ctx))
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrBackupNotFound)
	}

	if artifact.Status != model.BackupStatusCompleted {
		return nil, apperror.BadRequest(apperror.ErrBackupNotCompleted)
	}

	if !helper.IsReadableBackupPath(artifact.FilePath) {
		return nil, apperror.BadRequest(apperror.ErrInvalidSavePath)
	}

	ok, message := VerifyFile(artifact.FilePath, artifact.FileName, artifact.Checksum, req.Passphrase)

	return &dto.BackupVerifyResponse{OK: ok, Message: message}, nil
}
