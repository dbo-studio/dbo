package dto

import (
	"mime/multipart"
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
	}

	BackupResponse struct {
		JobID int32 `json:"jobId"`
	}

	BackupJob struct {
		OwnerID string `json:"ownerId"`
		BackupRequest
	}

	RestoreRequest struct {
		ConnectionID int32  `json:"connectionId"`
		Database     string `json:"database"`
		Schema       string `json:"schema"`
		ArtifactID   uint   `json:"artifactId"`
		// ConfirmName must repeat Database exactly; it is the typed
		// confirmation for an action that overwrites data.
		ConfirmName string `json:"confirmName"`
		// SafetyBackup queues a backup of the target first; the restore only
		// runs if that backup succeeds.
		SafetyBackup bool `json:"safetyBackup"`
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
	}

	BackupArtifactResponse struct {
		ID           uint       `json:"id"`
		ConnectionID uint       `json:"connectionId"`
		JobID        uint       `json:"jobId"`
		Database     string     `json:"database"`
		Schema       string     `json:"schema"`
		Driver       string     `json:"driver"`
		Method       string     `json:"method"`
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

	BackupDownloadRequest struct {
		ID uint
	}
)

func (req BackupRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.Database, validation.Length(0, 255)),
		validation.Field(&req.Note, validation.Length(0, 500)),
	)
}

func (req RestoreRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.Database, validation.Required, validation.Length(1, 255)),
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
