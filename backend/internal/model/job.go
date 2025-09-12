package model

import (
	"time"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

type JobStatus string

const (
	JobStatusPending   JobStatus = "pending"
	JobStatusRunning   JobStatus = "running"
	JobStatusCompleted JobStatus = "completed"
	JobStatusFailed    JobStatus = "failed"
	JobStatusCancelled JobStatus = "cancelled"
)

type JobType string

const (
	JobTypeImport JobType = "import"
	JobTypeExport JobType = "export"
	JobTypeQuery  JobType = "query"
)

type Job struct {
	ID          uint      `gorm:"primaryKey,autoIncrement"`
	Type        JobType   `gorm:"not null"`
	Status      JobStatus `gorm:"not null;default:'pending'"`
	Progress    int       `gorm:"default:0"`
	Message     string
	Error       string
	Data        string    `grom:"not null"`
	Result      JobResult `gorm:"type:json;serializer:json"`
	StartedAt   *time.Time
	CompletedAt *time.Time
	CreatedAt   *time.Time `gorm:"autoCreateTime"`
	UpdatedAt   *time.Time `gorm:"autoUpdateTime"`
}

type JobResult struct {
	TotalRows   int                            `json:"totalRows"`
	SuccessRows int                            `json:"successRows"`
	FailedRows  int                            `json:"failedRows"`
	FilePath    string                         `json:"filePath"`
	FileName    string                         `json:"fileName"`
	Errors      []databaseContract.ImportError `json:"errors"`
	Format      string                         `json:"format"`
	TableName   string                         `json:"tableName"`
	Data        any                            `json:"data"`
	Size        int64                          `json:"size"`
	Rows        int                            `json:"rows"`
	Columns     int                            `json:"columns"`
	TotalChunks int                            `json:"totalChunks"`
	ChunkSize   int                            `json:"chunkSize"`
	Query       string                         `json:"query"`
}
