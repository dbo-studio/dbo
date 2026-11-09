package processors

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceBackup "github.com/dbo-studio/dbo/internal/service/backup"
	serviceConnector "github.com/dbo-studio/dbo/internal/service/connector"
	serviceJob "github.com/dbo-studio/dbo/internal/service/job"
	serviceSecretStore "github.com/dbo-studio/dbo/internal/service/secret_store"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

const (
	drillPassed  = "passed"
	drillFailed  = "failed"
	drillSkipped = "skipped"
)

type drillResult struct{ status, message string }

// RestoreDrillProcessor proves a backup can be restored: it replays the file into a scratch database
// made for the purpose, checks the tables came back, and drops the scratch database. It never
// touches the connection's real databases. "skipped" means the test could not be tried here (no
// right to create a database, no tool, an encrypted file with no passphrase), which is not a failure.
type RestoreDrillProcessor struct {
	jobManager     serviceJob.IJobManager
	cm             *databaseConnection.ConnectionManager
	connectionRepo repository.IConnectionRepo
	artifactRepo   repository.IBackupArtifactRepo
	scheduleRepo   repository.IBackupScheduleRepo
	secrets        serviceSecretStore.ISecretStore
	remote         serviceBackup.Remote
}

func NewRestoreDrillProcessor(jobManager serviceJob.IJobManager, cm *databaseConnection.ConnectionManager, connectionRepo repository.IConnectionRepo, artifactRepo repository.IBackupArtifactRepo, scheduleRepo repository.IBackupScheduleRepo, secrets serviceSecretStore.ISecretStore, remote serviceBackup.Remote) *RestoreDrillProcessor {
	return &RestoreDrillProcessor{
		jobManager: jobManager, cm: cm, connectionRepo: connectionRepo, artifactRepo: artifactRepo,
		scheduleRepo: scheduleRepo, secrets: secrets, remote: remote,
	}
}

func (p *RestoreDrillProcessor) GetType() model.JobType { return model.JobTypeRestoreDrill }

func (p *RestoreDrillProcessor) Process(ctx context.Context, job *model.Job) error {
	jobData, err := helper.ConvertToDTO[dto.RestoreDrillJob]([]byte(job.Data))
	if err != nil {
		return err
	}

	ctx = helper.CtxWithOwnerID(ctx, jobData.OwnerID)

	artifact, err := p.artifactRepo.FindByOwner(ctx, jobData.ArtifactID, jobData.OwnerID)
	if err != nil {
		return apperror.ErrBackupNotFound
	}

	connection, err := p.connectionRepo.Find(ctx, int32(artifact.ConnectionID))
	if err != nil {
		return err
	}

	if artifact.Status != model.BackupStatusCompleted {
		return apperror.ErrBackupNotCompleted
	}

	if err := serviceBackup.EnsureLocal(ctx, p.remote, artifact); err != nil {
		return err
	}

	if !helper.IsReadableBackupPath(artifact.FilePath) {
		return apperror.ErrInvalidSavePath
	}

	if err := p.jobManager.UpdateJobProgress(ctx, job, 10, "Opening "+artifact.FileName); err != nil {
		return err
	}

	plain := *artifact
	passphrase := serviceBackup.TakePassphrase(job.ID)

	var res drillResult

	switch {
	case serviceBackup.IsEncrypted(artifact.FileName) && passphrase == "":
		res = drillResult{drillSkipped, "The backup is encrypted and no passphrase was given, so it cannot be opened here."}
	default:
		if serviceBackup.IsEncrypted(artifact.FileName) || serviceBackup.IsCompressed(artifact.FileName) {
			plain.FileName = serviceBackup.PlainName(artifact.FileName)
			plain.FilePath = filepath.Join(helper.BackupDir, fmt.Sprintf("drill_%d_%s", job.ID, plain.FileName))

			if err := serviceBackup.Unseal(artifact.FilePath, plain.FilePath, passphrase); err != nil {
				return err
			}

			defer func() { _ = os.Remove(plain.FilePath) }()
		}

		if err := p.jobManager.UpdateJobProgress(ctx, job, 25, "Restoring into a scratch database"); err != nil {
			return err
		}

		if connection.ConnectionType == string(databaseContract.Sqlite) {
			res = p.drillSQLite(ctx, job, &plain)
		} else {
			res = p.drillSQL(ctx, connection, &plain)
		}
	}

	// The job context is cancelled on a user cancel; the outcome still has to be recorded.
	bg := context.WithoutCancel(ctx)
	now := time.Now()
	_ = p.artifactRepo.UpdateFields(bg, artifact.ID, map[string]any{
		"drill_status": res.status, "drill_message": res.message, "drilled_at": &now,
	})
	p.notify(bg, artifact, connection, res)

	if res.status == drillFailed {
		return errors.New("restore test failed: " + res.message)
	}

	// The job manager words its own completion message, so what the test found travels in the result.
	job.Result = model.JobResult{Data: map[string]string{"status": res.status, "message": res.message}}

	return p.jobManager.UpdateJobProgress(ctx, job, 100, "Restore test "+res.status+": "+res.message)
}

// drillSQL restores a SQL dump into a scratch database on the connection's server and counts tables.
func (p *RestoreDrillProcessor) drillSQL(ctx context.Context, connection *model.Connection, artifact *model.BackupArtifact) (res drillResult) {
	if !strings.HasSuffix(artifact.FileName, ".sql") {
		return drillResult{drillSkipped, "This backup is not a SQL dump."}
	}

	// The built-in dump names tables without a database, so it cannot be replayed into a scratch database.
	if databaseContract.IsHostSQL(connection.ConnectionType) {
		return drillResult{drillSkipped, "A restore test is not available for this engine."}
	}

	password, err := p.secrets.GetConnectionPassword(ctx, artifact.OwnerID, connection.ID)
	if err != nil {
		return drillResult{drillSkipped, "The connection password is not stored, so a test cannot log in."}
	}

	expected, err := serviceBackup.CountCreateTables(artifact.FilePath)
	if err != nil {
		return drillResult{drillFailed, "Could not read the backup: " + err.Error()}
	}

	db, err := p.cm.GetConnection(ctx, connection, false)
	if err != nil {
		return drillResult{drillSkipped, "Could not connect: " + err.Error()}
	}

	driver := connection.ConnectionType

	name, err := serviceBackup.DrillDatabaseName(artifact.ID)
	if err != nil {
		return drillResult{drillFailed, err.Error()}
	}

	create, err := serviceBackup.CreateDrillSQL(driver, name)
	if err != nil {
		return drillResult{drillFailed, err.Error()}
	}

	if err := db.WithContext(ctx).Exec(create).Error; err != nil {
		return drillResult{drillSkipped, "Could not create a scratch database (this account may not be allowed to): " + err.Error()}
	}

	// From here the scratch database exists and must go, however the test ends.
	defer func() {
		if err := dropScratch(context.WithoutCancel(ctx), db, driver, name); err != nil {
			res.message += fmt.Sprintf(" WARNING: the scratch database %s could not be removed (%v); drop it by hand.", name, err)
		}
	}()

	cmd, err := serviceBackup.PlanNativeRestore(ctx, connection, password, name, artifact.FilePath)
	if errors.Is(err, serviceBackup.ErrNativeUnavailable) {
		return drillResult{drillSkipped, err.Error()}
	}

	if err != nil {
		return drillResult{drillFailed, err.Error()}
	}

	stderr, err := cmd.Run(ctx)
	if err != nil {
		return drillResult{drillFailed, err.Error()}
	}

	if failures := restoreErrors(stderr); len(failures) > 0 {
		return drillResult{drillFailed, fmt.Sprintf("The restore hit %d error(s); first: %s", len(failures), failures[0])}
	}

	count, err := serviceBackup.PlanNativeQuery(ctx, connection, password, name, serviceBackup.TableCountSQL(driver, name, artifact.Schema))
	if err != nil {
		return drillResult{drillSkipped, err.Error()}
	}

	out, err := count.Output(ctx)
	if err != nil {
		return drillResult{drillFailed, "The restored database could not be read: " + err.Error()}
	}

	got, err := strconv.Atoi(out)
	if err != nil {
		return drillResult{drillFailed, "Unexpected answer counting tables: " + out}
	}

	if got != expected {
		return drillResult{drillFailed, fmt.Sprintf("The dump has %d table(s) but the restore produced %d.", expected, got)}
	}

	return drillResult{drillPassed, fmt.Sprintf("Restored into a scratch database and found all %d table(s). The scratch database was removed.", got)}
}

// dropScratch removes a scratch database. The statement builder refuses any other name.
func dropScratch(ctx context.Context, db *gorm.DB, driver, name string) error {
	statement, err := serviceBackup.DropDrillSQL(driver, name, true)
	if err != nil {
		return err
	}

	if err := db.WithContext(ctx).Exec(statement).Error; err == nil {
		return nil
	}

	// Older Postgres has no WITH (FORCE).
	statement, err = serviceBackup.DropDrillSQL(driver, name, false)
	if err != nil {
		return err
	}

	return db.WithContext(ctx).Exec(statement).Error
}

// drillSQLite restores a SQLite backup file into a temporary database, checks its integrity and
// compares the number of tables and indexes with the backup.
func (p *RestoreDrillProcessor) drillSQLite(ctx context.Context, job *model.Job, artifact *model.BackupArtifact) drillResult {
	if !strings.HasSuffix(artifact.FileName, ".sqlite") {
		return drillResult{drillSkipped, "This backup is not a SQLite database file."}
	}

	scratch := filepath.Join(helper.BackupDir, fmt.Sprintf("drill_%d.db", job.ID))
	defer func() {
		for _, suffix := range []string{"", "-journal", "-wal", "-shm"} {
			_ = os.Remove(scratch + suffix)
		}
	}()

	target, closeTarget, err := openSQLite(scratch)
	if err != nil {
		return drillResult{drillFailed, err.Error()}
	}

	defer closeTarget()

	if err := serviceBackup.RestoreSQLite(ctx, target, artifact.FilePath, false); err != nil {
		return drillResult{drillFailed, err.Error()}
	}

	var integrity string
	if err := target.WithContext(ctx).Raw("PRAGMA integrity_check").Scan(&integrity).Error; err != nil || integrity != "ok" {
		return drillResult{drillFailed, "Integrity check failed: " + strings.TrimSpace(integrity+" "+fmt.Sprint(err))}
	}

	source, closeSource, err := openSQLite("file:" + artifact.FilePath + "?mode=ro")
	if err != nil {
		return drillResult{drillFailed, err.Error()}
	}

	defer closeSource()

	const objects = "SELECT count(*) FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'"

	var want, got int
	if err := source.WithContext(ctx).Raw(objects).Scan(&want).Error; err != nil {
		return drillResult{drillFailed, "Could not read the backup: " + err.Error()}
	}

	if err := target.WithContext(ctx).Raw(objects).Scan(&got).Error; err != nil {
		return drillResult{drillFailed, "Could not read the restored database: " + err.Error()}
	}

	if got != want {
		return drillResult{drillFailed, fmt.Sprintf("The backup has %d table(s) and index(es) but the restore produced %d.", want, got)}
	}

	return drillResult{drillPassed, fmt.Sprintf("Restored into a temporary database that passed the integrity check, with all %d table(s) and index(es).", got)}
}

func openSQLite(path string) (*gorm.DB, func(), error) {
	db, err := gorm.Open(sqlite.Open(path), &gorm.Config{})
	if err != nil {
		return nil, func() {}, err
	}

	closeDB := func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	}

	return db, closeDB, nil
}

// notify tells a scheduled backup's channels about a failed test (or any result when they asked for that).
func (p *RestoreDrillProcessor) notify(ctx context.Context, artifact *model.BackupArtifact, connection *model.Connection, res drillResult) {
	if artifact.ScheduleID == 0 || res.status == drillSkipped {
		return
	}

	schedule, err := p.scheduleRepo.FindByOwner(ctx, artifact.ScheduleID, artifact.OwnerID)
	if err != nil || len(schedule.Channels()) == 0 || schedule.NotifyOn == "never" || (res.status == drillPassed && schedule.NotifyOn != "always") {
		return
	}

	failed := res.status == drillFailed

	e := serviceConnector.Event{
		Kind: "restore", Name: schedule.Name + " (restore test)", Connection: connection.Name,
		Database: artifact.Database, Failed: failed, At: time.Now(),
	}
	if failed {
		e.Error = res.message
	}

	p.remote.Notify(ctx, artifact.OwnerID, schedule.Channels(), e)
}
