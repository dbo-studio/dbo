package processors

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceBackup "github.com/dbo-studio/dbo/internal/service/backup"
	serviceJob "github.com/dbo-studio/dbo/internal/service/job"
	serviceSecretStore "github.com/dbo-studio/dbo/internal/service/secret_store"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

// BackupProcessor writes a whole-database dump and records it as a backup
// artifact. It prefers the native route (pg_dump, mysqldump, SQLite VACUUM
// INTO) and falls back to DBO's built-in dump (method "basic") only when no
// tool is available. If a native tool runs and fails, the job fails.
type BackupProcessor struct {
	jobManager     serviceJob.IJobManager
	cm             *databaseConnection.ConnectionManager
	connectionRepo repository.IConnectionRepo
	artifactRepo   repository.IBackupArtifactRepo
	scheduleRepo   repository.IBackupScheduleRepo
	secrets        serviceSecretStore.ISecretStore
	cache          cache.Cache
}

func NewBackupProcessor(jobManager serviceJob.IJobManager, cm *databaseConnection.ConnectionManager, connectionRepo repository.IConnectionRepo, artifactRepo repository.IBackupArtifactRepo, scheduleRepo repository.IBackupScheduleRepo, secrets serviceSecretStore.ISecretStore, appCache cache.Cache) *BackupProcessor {
	return &BackupProcessor{
		jobManager:     jobManager,
		cm:             cm,
		connectionRepo: connectionRepo,
		artifactRepo:   artifactRepo,
		scheduleRepo:   scheduleRepo,
		secrets:        secrets,
		cache:          appCache,
	}
}

func (p *BackupProcessor) GetType() model.JobType {
	return model.JobTypeBackup
}

func (p *BackupProcessor) Process(ctx context.Context, job *model.Job) error {
	if ctx.Err() != nil || job.Status == model.JobStatusCancelled {
		return fmt.Errorf("job was canceled")
	}

	jobData, err := helper.ConvertToDTO[dto.BackupJob]([]byte(job.Data))
	if err != nil {
		return err
	}

	ownerID := jobData.OwnerID
	ctx = helper.CtxWithOwnerID(ctx, ownerID)

	connection, err := p.connectionRepo.Find(ctx, jobData.ConnectionID)
	if err != nil {
		return err
	}

	artifact := &model.BackupArtifact{
		OwnerID:      ownerID,
		ConnectionID: connection.ID,
		JobID:        job.ID,
		ScheduleID:   jobData.ScheduleID,
		Database:     jobData.Database,
		Schema:       jobData.Schema,
		Driver:       connection.ConnectionType,
		Method:       model.BackupMethodBasic,
		Status:       model.BackupStatusRunning,
		Note:         jobData.Note,
		StartedAt:    time.Now(),
	}

	artifact.SealCompress = jobData.Compress
	artifact.SealPublicKey, _ = hex.DecodeString(jobData.PublicKey)
	artifact.SealWrappedKey, _ = hex.DecodeString(jobData.WrappedKey)

	logLine(artifact, "Started %s backup of %s", connection.ConnectionType, lo.CoalesceOrEmpty(jobData.Database, connection.Name))

	if err := p.artifactRepo.Create(ctx, artifact); err != nil {
		return err
	}

	filePath, runErr := p.run(ctx, job, connection, &jobData, artifact)
	if runErr != nil {
		if filePath != "" {
			_ = os.Remove(filePath)
		}

		// The job context is canceled on a user cancel; the failure still
		// has to reach history.
		p.finish(context.WithoutCancel(ctx), artifact, map[string]any{
			"status": model.BackupStatusFailed,
			"error":  runErr.Error(),
			"log":    artifact.Log + time.Now().Format("15:04:05") + " Failed: " + runErr.Error() + "\n",
		})
		p.recordSchedule(context.WithoutCancel(ctx), &jobData, "failed", runErr.Error(), 0)

		return runErr
	}

	p.finish(ctx, artifact, map[string]any{
		"status":       model.BackupStatusCompleted,
		"method":       artifact.Method,
		"compressed":   artifact.Compressed,
		"encrypted":    artifact.Encrypted,
		"log":          artifact.Log,
		"tool":         artifact.Tool,
		"tool_version": artifact.ToolVersion,
		"file_name":    artifact.FileName,
		"file_path":    artifact.FilePath,
		"size":         artifact.Size,
		"checksum":     artifact.Checksum,
	})

	p.recordSchedule(ctx, &jobData, "completed", "", artifact.Size)

	job.Result = model.JobResult{
		FileName:   artifact.FileName,
		FilePath:   artifact.FilePath,
		Size:       artifact.Size,
		ArtifactID: artifact.ID,
		Format:     strings.TrimPrefix(filepath.Ext(artifact.FileName), "."),
	}

	return nil
}

// run connects, dumps and fills the artifact's file fields. It returns the
// path it started writing so the caller can clean up after a failure.
func (p *BackupProcessor) run(ctx context.Context, job *model.Job, connection *model.Connection, jobData *dto.BackupJob, artifact *model.BackupArtifact) (string, error) {
	// Pin the password in memory for the whole job so reconnects don't depend
	// on SecretStore TTL.
	var password string

	if connection.ConnectionType != "sqlite" {
		pw, err := p.secrets.GetConnectionPassword(ctx, jobData.OwnerID, connection.ID)
		if err != nil {
			return "", err
		}

		password = pw
		ctx = helper.CtxWithConnectionPassword(ctx, pw)
	}

	if err := helper.EnsureBackupDir(); err != nil {
		return "", fmt.Errorf("failed to create backup directory: %w", err)
	}

	if err := p.checkDiskSpace(ctx, jobData); err != nil {
		return "", err
	}

	label := fileLabel(lo.CoalesceOrEmpty(jobData.Database, jobData.Schema, "database"))
	stamp := time.Now().Format("20060102_150405")

	setFile := func(ext string) {
		artifact.FileName = fmt.Sprintf("backup_%s_%s.%s", label, stamp, ext)
		artifact.FilePath = filepath.Join(helper.BackupDir, fmt.Sprintf("%d_%s", artifact.ID, artifact.FileName))
	}

	native, err := p.runNative(ctx, job, connection, jobData, artifact, password, setFile)
	if err != nil || native {
		return artifact.FilePath, err
	}

	setFile("sql")

	artifact.Method = model.BackupMethodBasic

	repo, err := database.NewDatabaseRepository(ctx, connection, p.cm)
	if err != nil {
		return "", err
	}

	if err := p.jobManager.UpdateJobProgress(ctx, job, 10, "Connected to database"); err != nil {
		return "", err
	}

	export := dto.ExportJob{
		OwnerID: jobData.OwnerID,
		ExportRequest: dto.ExportRequest{
			ConnectionID: jobData.ConnectionID,
			Scope:        dto.ExportScopeDatabase,
			Database:     jobData.Database,
			Schema:       jobData.Schema,
			Content:      dto.ExportContentBoth,
			Format:       "sql",
			ChunkSize:    1000,
		},
	}

	targets, err := exportTargets(ctx, p.cache, repo, connection, &export)
	if err != nil {
		return "", err
	}

	dump, targets, err := schemaDumpFor(ctx, repo, connection.ConnectionType, &export, targets)
	if err != nil {
		return "", err
	}

	if err := p.jobManager.UpdateJobProgress(ctx, job, 20, fmt.Sprintf("Backing up %d table(s)", len(targets))); err != nil {
		return artifact.FilePath, err
	}

	_, _, err = writeExport(ctx, repo, connection.ConnectionType, &export, targets, dump, artifact.FilePath, false, func(i int, name string) {
		_ = p.jobManager.UpdateJobProgress(ctx, job, 20+70*i/len(targets), "Backing up "+name)
	})
	if err != nil {
		return artifact.FilePath, err
	}

	return artifact.FilePath, p.completeFile(ctx, job, artifact)
}

// runNative produces the artifact with a native tool. It reports false, with no
// error, when none is available so the caller can use the built-in dump.
func (p *BackupProcessor) runNative(ctx context.Context, job *model.Job, connection *model.Connection, jobData *dto.BackupJob, artifact *model.BackupArtifact, password string, setFile func(ext string)) (bool, error) {
	if connection.ConnectionType == "sqlite" {
		return true, p.sqliteVacuumInto(ctx, job, connection, artifact, setFile)
	}

	setFile("sql")

	dump, err := serviceBackup.PlanNativeDump(ctx, connection, password, jobData.Database, jobData.Schema, artifact.FilePath)
	if errors.Is(err, serviceBackup.ErrNativeUnavailable) {
		return false, nil
	}

	if err != nil {
		return true, err
	}

	logLine(artifact, "Using %s %s", dump.Tool, dump.Version)

	artifact.Method = model.BackupMethodNative
	artifact.Tool = dump.Tool
	artifact.ToolVersion = dump.Version

	if err := p.jobManager.UpdateJobProgress(ctx, job, 20, fmt.Sprintf("Running %s %s", dump.Tool, dump.Version)); err != nil {
		return true, err
	}

	stderr, err := dump.Run(ctx)
	if err != nil {
		return true, err
	}

	if stderr != "" {
		logLine(artifact, "%s warnings: %s", dump.Tool, strings.TrimSpace(stderr))
	}

	return true, p.completeFile(ctx, job, artifact)
}

// sqliteVacuumInto copies the database with SQLite's own consistent snapshot,
// which is safe while DBO holds the file open.
func (p *BackupProcessor) sqliteVacuumInto(ctx context.Context, job *model.Job, connection *model.Connection, artifact *model.BackupArtifact, setFile func(ext string)) error {
	setFile("sqlite")

	db, err := p.cm.GetConnection(ctx, connection, false)
	if err != nil {
		return err
	}

	artifact.Method = model.BackupMethodNative
	artifact.Tool = "sqlite"
	artifact.ToolVersion = "VACUUM INTO"

	if err := p.jobManager.UpdateJobProgress(ctx, job, 20, "Copying SQLite database"); err != nil {
		return err
	}

	if err := db.WithContext(ctx).Exec("VACUUM INTO ?", artifact.FilePath).Error; err != nil {
		return err
	}

	return p.completeFile(ctx, job, artifact)
}

func (p *BackupProcessor) completeFile(ctx context.Context, job *model.Job, artifact *model.BackupArtifact) error {
	if err := p.seal(artifact); err != nil {
		return err
	}

	var err error

	artifact.Size, artifact.Checksum, err = fileSizeAndChecksum(artifact.FilePath)
	if err != nil {
		return err
	}

	logLine(artifact, "Wrote %s (%d bytes, sha256 %s)", artifact.FileName, artifact.Size, artifact.Checksum[:12])

	// A compressed file can be read back right away. An encrypted one cannot:
	// only the passphrase opens it, and the server never has it.
	if !artifact.Encrypted {
		if ok, message := serviceBackup.VerifyFile(artifact.FilePath, artifact.FileName, artifact.Checksum, ""); !ok {
			return fmt.Errorf("verification failed: %s", message)
		}

		logLine(artifact, "Verified: %s", "contents read back")
	}

	return p.jobManager.UpdateJobProgress(ctx, job, 100, "Backup completed successfully")
}

func (p *BackupProcessor) finish(ctx context.Context, artifact *model.BackupArtifact, fields map[string]any) {
	fields["completed_at"] = time.Now()

	// A history write failing must not turn a good backup into a failed job.
	_ = p.artifactRepo.UpdateFields(ctx, artifact.ID, fields)
}

func fileSizeAndChecksum(path string) (int64, string, error) {
	f, err := os.Open(path)
	if err != nil {
		return 0, "", err
	}

	defer func() { _ = f.Close() }()

	h := sha256.New()

	size, err := io.Copy(h, f)
	if err != nil {
		return 0, "", err
	}

	return size, hex.EncodeToString(h.Sum(nil)), nil
}

var unsafeFileChars = regexp.MustCompile(`[^A-Za-z0-9._-]+`)

// fileLabel keeps a database name usable in a file name; the name itself came
// from the request.
func fileLabel(name string) string {
	label := strings.Trim(unsafeFileChars.ReplaceAllString(name, "_"), "._")
	if label == "" {
		return "database"
	}

	return label
}

// recordSchedule stores a scheduled run's outcome on its schedule and, after a
// good run, applies retention. Failures here never fail the backup itself.
func (p *BackupProcessor) recordSchedule(ctx context.Context, jobData *dto.BackupJob, status, message string, size int64) {
	if jobData.ScheduleID == 0 {
		return
	}

	schedule, err := p.scheduleRepo.FindByOwner(ctx, jobData.ScheduleID, jobData.OwnerID)
	if err != nil {
		return
	}

	fields := map[string]any{"last_status": status, "last_error": message}
	if status == "completed" {
		fields["last_success_at"] = time.Now()
		fields["last_size"] = size
	}

	_ = p.scheduleRepo.UpdateFields(ctx, schedule.ID, fields)

	if status == "completed" {
		_ = serviceBackup.ApplyRetention(ctx, p.artifactRepo, schedule, time.Now())
	}
}

// minFreeBytes is the least free space a backup needs when no earlier backup
// gives a size to go on.
const minFreeBytes = 64 << 20

// checkDiskSpace refuses to start a backup that is likely not to fit: twice the
// last backup's size, or 64 MiB for a first one.
func (p *BackupProcessor) checkDiskSpace(ctx context.Context, jobData *dto.BackupJob) error {
	free, ok := helper.FreeDiskBytes(helper.BackupDir)
	if !ok {
		return nil
	}

	need := uint64(minFreeBytes)

	connectionID := uint(jobData.ConnectionID) //nolint:gosec // validated positive
	if history, err := p.artifactRepo.ListByOwner(ctx, jobData.OwnerID, &connectionID); err == nil {
		for _, a := range history {
			if a.Status == model.BackupStatusCompleted && a.Size > 0 {
				need = max(need, uint64(a.Size)*2) //nolint:gosec // sizes are never negative

				break
			}
		}
	}

	if free < need {
		return fmt.Errorf("not enough disk space for the backup: %d MiB free, need about %d MiB", free>>20, need>>20)
	}

	return nil
}

// seal applies the run's compression and encryption to the finished dump and
// points the artifact at the sealed file.
func (p *BackupProcessor) seal(artifact *model.BackupArtifact) error {
	var enc *serviceBackup.Encryption
	if len(artifact.SealPublicKey) > 0 {
		enc = &serviceBackup.Encryption{PublicKey: artifact.SealPublicKey, WrappedKey: artifact.SealWrappedKey}
	}

	sealed, err := serviceBackup.Seal(artifact.FilePath, artifact.SealCompress, enc)
	if err != nil {
		return err
	}

	if sealed == artifact.FilePath {
		return nil
	}

	artifact.FilePath = sealed
	artifact.FileName = strings.TrimPrefix(filepath.Base(sealed), fmt.Sprintf("%d_", artifact.ID))
	artifact.Compressed = artifact.SealCompress
	artifact.Encrypted = enc != nil

	logLine(artifact, "Sealed: compressed=%t encrypted=%t", artifact.Compressed, artifact.Encrypted)

	return nil
}

// logLine adds a line to the run's log, kept with the artifact for the console.
func logLine(artifact *model.BackupArtifact, format string, args ...any) {
	artifact.Log += time.Now().Format("15:04:05") + " " + fmt.Sprintf(format, args...) + "\n"
}
