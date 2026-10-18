package dto

import (
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/invopop/validation"
)

type (
	BackupScheduleRequest struct {
		ConnectionID int32  `json:"connectionId"`
		Name         string `json:"name"`
		Database     string `json:"database"`
		Schema       string `json:"schema"`
		Cadence      string `json:"cadence"`
		Hour         int    `json:"hour"`
		Minute       int    `json:"minute"`
		Weekday      int    `json:"weekday"`
		Timezone     string `json:"timezone"`
		KeepLast     int    `json:"keepLast"`
		KeepDays     int    `json:"keepDays"`
	}

	// BackupScheduleUpdateRequest changes only the fields that are sent.
	BackupScheduleUpdateRequest struct {
		ID       uint
		Enabled  *bool   `json:"enabled"`
		Name     *string `json:"name"`
		Database *string `json:"database"`
		Schema   *string `json:"schema"`
		Cadence  *string `json:"cadence"`
		Hour     *int    `json:"hour"`
		Minute   *int    `json:"minute"`
		Weekday  *int    `json:"weekday"`
		Timezone *string `json:"timezone"`
		KeepLast *int    `json:"keepLast"`
		KeepDays *int    `json:"keepDays"`
	}

	BackupScheduleResponse struct {
		ID           uint       `json:"id"`
		ConnectionID uint       `json:"connectionId"`
		Name         string     `json:"name"`
		Database     string     `json:"database"`
		Schema       string     `json:"schema"`
		Cadence      string     `json:"cadence"`
		Hour         int        `json:"hour"`
		Minute       int        `json:"minute"`
		Weekday      int        `json:"weekday"`
		Timezone     string     `json:"timezone"`
		Enabled      bool       `json:"enabled"`
		KeepLast     int        `json:"keepLast"`
		KeepDays     int        `json:"keepDays"`
		NextRunAt    *time.Time `json:"nextRunAt"`
		LastRunAt    *time.Time `json:"lastRunAt"`
		LastStatus   string     `json:"lastStatus"`
		LastError    string     `json:"lastError"`
	}

	BackupScheduleIDRequest struct {
		ID uint
	}
)

var cadences = []any{model.ScheduleCadenceHourly, model.ScheduleCadenceDaily, model.ScheduleCadenceWeekly}

func (req BackupScheduleRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.ConnectionID, validation.Required, validation.Min(0)),
		validation.Field(&req.Name, validation.Required, validation.Length(1, 100)),
		validation.Field(&req.Database, validation.Length(0, 255), validation.Match(objectName)),
		validation.Field(&req.Schema, validation.Length(0, 255), validation.Match(objectName)),
		validation.Field(&req.Cadence, validation.Required, validation.In(cadences...)),
		validation.Field(&req.Hour, validation.Min(0), validation.Max(23)),
		validation.Field(&req.Minute, validation.Min(0), validation.Max(59)),
		validation.Field(&req.Weekday, validation.Min(0), validation.Max(6)),
		validation.Field(&req.KeepLast, validation.Min(0), validation.Max(10000)),
		validation.Field(&req.KeepDays, validation.Min(0), validation.Max(36500)),
	)
}

func (req BackupScheduleUpdateRequest) Validate() error {
	return validation.ValidateStruct(&req,
		validation.Field(&req.Name, validation.Length(1, 100)),
		validation.Field(&req.Database, validation.Length(0, 255), validation.Match(objectName)),
		validation.Field(&req.Schema, validation.Length(0, 255), validation.Match(objectName)),
		validation.Field(&req.Cadence, validation.In(cadences...)),
		validation.Field(&req.Hour, validation.Min(0), validation.Max(23)),
		validation.Field(&req.Minute, validation.Min(0), validation.Max(59)),
		validation.Field(&req.Weekday, validation.Min(0), validation.Max(6)),
		validation.Field(&req.KeepLast, validation.Min(0), validation.Max(10000)),
		validation.Field(&req.KeepDays, validation.Min(0), validation.Max(36500)),
	)
}
