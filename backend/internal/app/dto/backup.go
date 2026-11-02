package dto

import (
	"mime/multipart"
	"regexp"
	"time"

	"github.com/invopop/validation"
)

type (
	BackupRequest struct {
		ConnectionID int32 `json:"connectionId"`
		// Database is the database to back up. Schema narrows Postgres, which
		// needs one; MySQL and SQLite ignore it.
		Database string `json:"database"`
		Schema   string `json:"schema"`
		Note     string `json:"note"`
		// Compress gzips the backup; Passphrase encrypts it. The passphrase turns
		// into key material in the service and is never put in the job.
		Compress   bool   `json:"compress"`
		Passphrase string `json:"passphrase"`
	}

	BackupResponse struct {
		JobID int32 `json:"jobId"`
	}

	BackupJob struct {
		OwnerID string `json:"ownerId"`
		BackupRequest
		// ScheduleID is set for runs started by a schedule.
		ScheduleID uint `json:"scheduleId"`
		// PublicKey and WrappedKey are hex; together they encrypt the backup.
		PublicKey  string `json:"publicKey"`
		WrappedKey string `json:"wrappedKey"`
	}

	RestoreRequest struct {
		ConnectionID int32  `json:"connectionId"`
		Database     string `json:"database"`
		Schema       string `json:"schema"`
		ArtifactID   uint   `json:"artifactId"`
		// ConfirmName must repeat Database exactly; it is the typed
		// confirmation for an action that overwrites data.
		ConfirmName string `json:"confirmName"`
		// Passphrase opens an encrypted backup. It is held in memory for the job
		// and never stored in the job row.
		Passphrase string `json:"passphrase"`
		// SafetyBackup queues a backup of the target first; the restore only
		// runs if that backup succeeds.
		SafetyBackup bool `json:"safetyBackup"`
		// CreateDatabase creates Database first (Postgres and MySQL), so a restore
		// can go into a new, empty database instead of overwriting one.
		CreateDatabase bool `json:"createDatabase"`
	}

	RestoreResponse struct {
		JobID int32 `json:"jobId"`
	}

	RestoreJob struct {
		OwnerID string `json:"ownerId"`
		RestoreRequest
		// SafetyJobID is the backup job that must have completed first.
		SafetyJobID uint `json:"safetyJobId"`
	}

	BackupUploadRequest struct {
		ConnectionID int32                 `form:"connectionId"`
		Note         string                `form:"note"`
		File         *multipart.FileHeader `form:"file"`
	}

	BackupHistoryRequest struct {
		ConnectionID *uint `query:"connectionId"`
		ScheduleID   *uint `query:"scheduleId"`
	}

	BackupArtifactResponse struct {
		ID           uint       `json:"id"`
		ConnectionID uint       `json:"connectionId"`
		JobID        uint       `json:"jobId"`
		ScheduleID   uint       `json:"scheduleId"`
		Database     string     `json:"database"`
		Schema       string     `json:"schema"`
		Driver       string     `json:"driver"`
		Method       string     `json:"method"`
		Log          string     `json:"log"`
		Compressed   bool       `json:"compressed"`
		Encrypted    bool       `json:"encrypted"`
		Tool         string     `json:"tool"`
		ToolVersion  string     `json:"toolVersion"`
		Status       string     `json:"status"`
		Note         string     `json:"note"`
		FileName     string     `json:"fileName"`
		Size         int64      `json:"size"`
		Checksum     string     `json:"checksum"`
		Error        string     `json:"error"`
		StartedAt    time.Time  `json:"startedAt"`
		CompletedAt  *time.Time `json:"completedAt"`
	}

	// BackupTool is one native tool as detected on this host. Found false means
	// it is missing.
	BackupTool struct {
		Driver  string `json:"driver"`
		Name    string `json:"name"`
		Found   bool   `json:"found"`
		Path    string `json:"path"`
		Version string `json:"version"`
		// Source is "path" (system PATH) or "managed" (DBO tool directory).
		Source string `json:"source"`
		Error  string `json:"error"`
	}

	// BackupToolDownload is a pinned tool the user can choose to download.
	BackupToolDownload struct {
		Driver    string   `json:"driver"`
		Version   string   `json:"version"`
		Tools     []string `json:"tools"`
		URL       string   `json:"url"`
		Size      int64    `json:"size"`
		Installed bool     `json:"installed"`
	}

	ToolInstallRequest struct {
		Driver  string `json:"driver"`
		Version string `json:"version"`
	}

	ToolInstallJob struct {
		ToolInstallRequest
	}

	ToolInstallResponse struct {
		JobID int32 `json:"jobId"`
	}

	ToolRemoveRequest struct {
		Driver  string
		Version string
	}

	BackupVerifyRequest struct {
		ID         uint
		Passphrase string `json:"passphrase"`
	}

	BackupVerifyResponse struct {
		OK      bool   `json:"ok"`
		Message string `json:"message"`
	}

	BackupDownloadRequest struct {
		ID uint
	}
)

// objectName accepts plain database and schema names. It rejects a leading
// dash (read as a command-line option by mysql) and "=", ":" and "/" (pg_dump
// reads a --dbname holding them as a connection string, which could send the
// password to another host).
var objectName = regexp.MustCompile(`^[\p{L}\p{N}_][\p{L}\p{N}_.$ -]*$`)

func (req BackupRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.Database, validation.Length(0, 255), validation.Match(objectName)),
		validation.Field(&req.Schema, validation.Length(0, 255), validation.Match(objectName)),
		validation.Field(&req.Note, validation.Length(0, 500)),
	)
}

func (req RestoreRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.Database, validation.Required, validation.Length(1, 255), validation.Match(objectName)),
		validation.Field(&req.Schema, validation.Length(0, 255), validation.Match(objectName)),
		validation.Field(&req.ArtifactID, validation.Required),
		validation.Field(&req.ConfirmName, validation.Required),
	)
}

func (req ToolInstallRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Driver, validation.Required),
		validation.Field(&req.Version, validation.Required),
	)
}

func (req BackupUploadRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.Note, validation.Length(0, 500)),
		validation.Field(&req.File, validation.Required),
	)
}
