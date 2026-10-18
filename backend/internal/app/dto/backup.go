package dto

import (
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
	}

	RestoreResponse struct {
		JobID int32 `json:"jobId"`
	}

	RestoreJob struct {
		OwnerID string `json:"ownerId"`
		RestoreRequest
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
