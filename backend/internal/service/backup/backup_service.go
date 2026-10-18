package serviceBackup

import (
	"context"
	"os"
	"path/filepath"

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
	History(ctx context.Context, req *dto.BackupHistoryRequest) ([]dto.BackupArtifactResponse, error)
	Download(ctx context.Context, req *dto.BackupDownloadRequest) (*response.FileDownload, error)
	Tools(ctx context.Context) []dto.BackupTool
	ToolDownloads(ctx context.Context) ([]dto.BackupToolDownload, error)
	InstallTool(ctx context.Context, req *dto.ToolInstallRequest) (*dto.ToolInstallResponse, error)
	RemoveTool(ctx context.Context, req *dto.ToolRemoveRequest) error
}

type IBackupServiceImpl struct {
	jobManager     serviceJob.IJobManager
	connectionRepo repository.IConnectionRepo
	artifactRepo   repository.IBackupArtifactRepo
	unlockStore    *serviceSafemode.UnlockStore
}

func NewBackupService(jobManager serviceJob.IJobManager, connectionRepo repository.IConnectionRepo, artifactRepo repository.IBackupArtifactRepo, appCache cache.Cache) IBackupService {
	return &IBackupServiceImpl{
		jobManager:     jobManager,
		connectionRepo: connectionRepo,
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

	job, err := s.jobManager.CreateJob(model.JobTypeBackup, ownerID, helper.StructToJSON(dto.BackupJob{
		OwnerID:       ownerID,
		BackupRequest: *req,
	}))
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

	job, err := s.jobManager.CreateJob(model.JobTypeRestore, ownerID, helper.StructToJSON(dto.RestoreJob{
		OwnerID:        ownerID,
		RestoreRequest: *req,
	}))
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return &dto.RestoreResponse{JobID: int32(job.ID)}, nil
}

func (s IBackupServiceImpl) History(ctx context.Context, req *dto.BackupHistoryRequest) ([]dto.BackupArtifactResponse, error) {
	artifacts, err := s.artifactRepo.ListByOwner(ctx, helper.CtxOwnerID(ctx), req.ConnectionID)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return lo.Map(artifacts, func(a model.BackupArtifact, _ int) dto.BackupArtifactResponse {
		return dto.BackupArtifactResponse{
			ID:           a.ID,
			ConnectionID: a.ConnectionID,
			JobID:        a.JobID,
			Database:     a.Database,
			Schema:       a.Schema,
			Driver:       a.Driver,
			Method:       string(a.Method),
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
