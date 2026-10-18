package processors

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceBackup "github.com/dbo-studio/dbo/internal/service/backup"
	serviceJob "github.com/dbo-studio/dbo/internal/service/job"
	serviceSecretStore "github.com/dbo-studio/dbo/internal/service/secret_store"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
)

// maxRestoreErrors bounds the error lines kept in a job result.
const maxRestoreErrors = 20

// RestoreProcessor replays a completed backup artifact into the target
// database: psql or mysql for SQL dumps, ATTACH-and-copy for SQLite files. The
// typed confirmation and Safe Mode were already enforced when the job was
// queued.
type RestoreProcessor struct {
	jobManager     serviceJob.IJobManager
	cm             *databaseConnection.ConnectionManager
	connectionRepo repository.IConnectionRepo
	artifactRepo   repository.IBackupArtifactRepo
	secrets        serviceSecretStore.ISecretStore
}

func NewRestoreProcessor(jobManager serviceJob.IJobManager, cm *databaseConnection.ConnectionManager, connectionRepo repository.IConnectionRepo, artifactRepo repository.IBackupArtifactRepo, secrets serviceSecretStore.ISecretStore) *RestoreProcessor {
	return &RestoreProcessor{
		jobManager:     jobManager,
		cm:             cm,
		connectionRepo: connectionRepo,
		artifactRepo:   artifactRepo,
		secrets:        secrets,
	}
}

func (p *RestoreProcessor) GetType() model.JobType {
	return model.JobTypeRestore
}

func (p *RestoreProcessor) Process(ctx context.Context, job *model.Job) error {
	jobData, err := helper.ConvertToDTO[dto.RestoreJob]([]byte(job.Data))
	if err != nil {
		return err
	}

	ctx = helper.CtxWithOwnerID(ctx, jobData.OwnerID)

	connection, err := p.connectionRepo.Find(ctx, jobData.ConnectionID)
	if err != nil {
		return err
	}

	artifact, err := p.artifactRepo.FindByOwner(ctx, jobData.ArtifactID, jobData.OwnerID)
	if err != nil {
		return apperror.ErrBackupNotFound
	}

	if jobData.SafetyJobID > 0 {
		safety, err := p.artifactRepo.FindByJob(ctx, jobData.SafetyJobID, jobData.OwnerID)
		if err != nil || safety.Status != model.BackupStatusCompleted {
			return apperror.ErrSafetyBackupFailed
		}
	}

	if !helper.IsReadableBackupPath(artifact.FilePath) {
		return apperror.ErrInvalidSavePath
	}

	if err := p.jobManager.UpdateJobProgress(ctx, job, 10, "Restoring "+artifact.FileName); err != nil {
		return err
	}

	if connection.ConnectionType == string(databaseContract.Sqlite) {
		return p.restoreSQLite(ctx, job, connection, artifact)
	}

	return p.restoreSQL(ctx, job, connection, &jobData, artifact)
}

func (p *RestoreProcessor) restoreSQLite(ctx context.Context, job *model.Job, connection *model.Connection, artifact *model.BackupArtifact) error {
	if !strings.HasSuffix(artifact.FileName, ".sqlite") {
		return errors.New("this backup is not a SQLite database file")
	}

	db, err := p.cm.GetConnection(ctx, connection, false)
	if err != nil {
		return err
	}

	if err := serviceBackup.RestoreSQLite(ctx, db, artifact.FilePath); err != nil {
		return err
	}

	return p.jobManager.UpdateJobProgress(ctx, job, 100, "Restore completed successfully")
}

func (p *RestoreProcessor) restoreSQL(ctx context.Context, job *model.Job, connection *model.Connection, jobData *dto.RestoreJob, artifact *model.BackupArtifact) error {
	if !strings.HasSuffix(artifact.FileName, ".sql") {
		return errors.New("this backup is not a SQL dump")
	}

	if artifact.Method == model.BackupMethodUploaded {
		if err := serviceBackup.ScanUploadedSQL(connection.ConnectionType, artifact.FilePath); err != nil {
			return err
		}
	}

	password, err := p.secrets.GetConnectionPassword(ctx, jobData.OwnerID, connection.ID)
	if err != nil {
		return err
	}

	cmd, err := serviceBackup.PlanNativeRestore(ctx, connection, password, jobData.Database, artifact.FilePath)
	if errors.Is(err, serviceBackup.ErrNativeUnavailable) {
		return fmt.Errorf("%w: %s", apperror.ErrRestoreToolMissing, err.Error())
	}

	if err != nil {
		return err
	}

	if err := p.jobManager.UpdateJobProgress(ctx, job, 20, fmt.Sprintf("Running %s %s", cmd.Tool, cmd.Version)); err != nil {
		return err
	}

	stderr, err := cmd.Run(ctx)
	if err != nil {
		return err
	}

	// psql keeps going after a failed statement, so its errors decide the
	// outcome here. Re-creating the schema that always exists is harmless.
	failures := restoreErrors(stderr)
	if len(failures) > 0 {
		return fmt.Errorf("restore finished with %d error(s); first: %s", len(failures), failures[0])
	}

	return p.jobManager.UpdateJobProgress(ctx, job, 100, "Restore completed successfully")
}

// restoreErrors returns the statement errors in psql's stderr, minus the
// benign "schema already exists" a single-schema dump produces.
func restoreErrors(stderr string) []string {
	var failures []string

	for _, line := range strings.Split(stderr, "\n") {
		if !strings.Contains(line, "ERROR:") {
			continue
		}

		if strings.Contains(line, "schema") && strings.Contains(line, "already exists") {
			continue
		}

		failures = append(failures, strings.TrimSpace(line))
		if len(failures) == maxRestoreErrors {
			break
		}
	}

	return failures
}
