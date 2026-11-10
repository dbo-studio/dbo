package dto

import (
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/invopop/validation"
)

type (
	BackupScheduleRequest struct {
		ConnectionID  int32  `json:"connectionId"`
		Name          string `json:"name"`
		Database      string `json:"database"`
		Schema        string `json:"schema"`
		Cadence       string `json:"cadence"`
		Hour          int    `json:"hour"`
		Minute        int    `json:"minute"`
		Weekday       int    `json:"weekday"`
		MonthDay      int    `json:"monthDay"`
		Timezone      string `json:"timezone"`
		KeepLast      int    `json:"keepLast"`
		KeepDays      int    `json:"keepDays"`
		KeepSmart     bool   `json:"keepSmart"`
		RetryMax      int    `json:"retryMax"`
		VerifyRestore bool   `json:"verifyRestore"`
		Compress      bool   `json:"compress"`
		// DestinationID also copies each backup to a destination; ChannelIDs and NotifyOn
		// ("failure", "always" or "never") say who hears about each run.
		DestinationID uint   `json:"destinationId"`
		ChannelIDs    []uint `json:"channelIds"`
		NotifyOn      string `json:"notifyOn"`
		// Passphrase encrypts every backup of the schedule; it is never returned.
		Passphrase string `json:"passphrase"`
	}

	// BackupScheduleUpdateRequest changes only the fields that are sent.
	BackupScheduleUpdateRequest struct {
		ID            uint
		Enabled       *bool   `json:"enabled"`
		Name          *string `json:"name"`
		Database      *string `json:"database"`
		Schema        *string `json:"schema"`
		Cadence       *string `json:"cadence"`
		Hour          *int    `json:"hour"`
		Minute        *int    `json:"minute"`
		Weekday       *int    `json:"weekday"`
		MonthDay      *int    `json:"monthDay"`
		Timezone      *string `json:"timezone"`
		KeepLast      *int    `json:"keepLast"`
		KeepDays      *int    `json:"keepDays"`
		KeepSmart     *bool   `json:"keepSmart"`
		RetryMax      *int    `json:"retryMax"`
		VerifyRestore *bool   `json:"verifyRestore"`
		Compress      *bool   `json:"compress"`
		DestinationID *uint   `json:"destinationId"`
		ChannelIDs    *[]uint `json:"channelIds"`
		NotifyOn      *string `json:"notifyOn"`
		// Passphrase, when sent and not empty, sets or replaces the passphrase.
		Passphrase *string `json:"passphrase"`
	}

	BackupScheduleResponse struct {
		ID            uint       `json:"id"`
		ConnectionID  uint       `json:"connectionId"`
		Name          string     `json:"name"`
		Database      string     `json:"database"`
		Schema        string     `json:"schema"`
		Cadence       string     `json:"cadence"`
		Hour          int        `json:"hour"`
		Minute        int        `json:"minute"`
		Weekday       int        `json:"weekday"`
		MonthDay      int        `json:"monthDay"`
		Timezone      string     `json:"timezone"`
		Enabled       bool       `json:"enabled"`
		KeepLast      int        `json:"keepLast"`
		KeepDays      int        `json:"keepDays"`
		KeepSmart     bool       `json:"keepSmart"`
		RetryMax      int        `json:"retryMax"`
		VerifyRestore bool       `json:"verifyRestore"`
		Compress      bool       `json:"compress"`
		Encrypted     bool       `json:"encrypted"`
		DestinationID uint       `json:"destinationId"`
		ChannelIDs    []uint     `json:"channelIds"`
		NotifyOn      string     `json:"notifyOn"`
		NextRunAt     *time.Time `json:"nextRunAt"`
		LastRunAt     *time.Time `json:"lastRunAt"`
		LastSuccessAt *time.Time `json:"lastSuccessAt"`
		LastSize      int64      `json:"lastSize"`
		LastStatus    string     `json:"lastStatus"`
		LastError     string     `json:"lastError"`
		// PasswordRemembered is false when a scheduled run could not log in:
		// the connection password is only held temporarily or not at all.
		PasswordRemembered bool `json:"passwordRemembered"`
	}

	BackupScheduleIDRequest struct {
		ID uint
	}
)

var notifyModes = []any{"failure", "always", "never"}

var cadences = []any{model.ScheduleCadenceHourly, model.ScheduleCadenceDaily, model.ScheduleCadenceWeekly, model.ScheduleCadenceMonthly}

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
		validation.Field(&req.MonthDay, validation.Min(0), validation.Max(28)),
		validation.Field(&req.KeepLast, validation.Min(0), validation.Max(10000)),
		validation.Field(&req.KeepDays, validation.Min(0), validation.Max(36500)),
		validation.Field(&req.RetryMax, validation.Min(0), validation.Max(5)),
		validation.Field(&req.NotifyOn, validation.In(notifyModes...)),
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
		validation.Field(&req.MonthDay, validation.Min(1), validation.Max(28)),
		validation.Field(&req.KeepLast, validation.Min(0), validation.Max(10000)),
		validation.Field(&req.KeepDays, validation.Min(0), validation.Max(36500)),
		validation.Field(&req.RetryMax, validation.Min(0), validation.Max(5)),
		validation.Field(&req.NotifyOn, validation.In(notifyModes...)),
	)
}
