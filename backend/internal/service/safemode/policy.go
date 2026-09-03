package safemode

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/sqlguard"
)

const (
	DefaultUnlockTTL = 10 * time.Minute
	MaxUnlockTTL     = 60 * time.Minute
	MinUnlockTTL     = 1 * time.Minute
)

// Policy is the effective connection safety policy.
type Policy struct {
	Mode          model.SafeMode
	Unlocked      bool
	UnlockedUntil *time.Time
}

// FromConnection builds a policy from a connection model (without unlock state).
func FromConnection(c *model.Connection) Policy {
	if c == nil {
		return Policy{Mode: model.SafeModeSilent}
	}

	return Policy{
		Mode: CoerceForEngine(NormalizeMode(string(c.SafeMode)), c.ConnectionType),
	}
}

// CoerceForEngine drops modes that do not apply to a driver.
// SQLite is a local file with no password — Safe Mode is not available.
func CoerceForEngine(mode model.SafeMode, connectionType string) model.SafeMode {
	if strings.EqualFold(connectionType, "sqlite") {
		return model.SafeModeSilent
	}

	return mode
}

// NormalizeMode returns a canonical Safe Mode value.
func NormalizeMode(mode string) model.SafeMode {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case string(model.SafeModeSilent), "off", "none", "":
		return model.SafeModeSilent
	case string(model.SafeModeAlert), "alert_all", "alert1":
		return model.SafeModeAlert
	case string(model.SafeModeAlertWrite), "alert2", "full":
		return model.SafeModeAlertWrite
	case string(model.SafeModeSafe), "safe_all", "safe1", "pass_all":
		return model.SafeModeSafe
	case string(model.SafeModeSafeWrite), "safe2", "pass_write", "read_only", "disallow_drop":
		return model.SafeModeSafeWrite
	default:
		return model.SafeModeSilent
	}
}

// ApplyCreateDefaults fills Safe Mode defaults.
func ApplyCreateDefaults(mode *string) model.SafeMode {
	if mode != nil {
		return NormalizeMode(*mode)
	}

	return model.SafeModeSilent
}

// IsReadClass reports whether the statement is allowed without prompts in write-scoped modes.
func IsReadClass(class sqlguard.Class) bool {
	return class == sqlguard.ClassRead
}

// Enforce evaluates policy against a statement class.
// confirmed=true satisfies ConfirmRequired / PasswordRequired for this request.
func Enforce(policy Policy, class sqlguard.Class, confirmed bool) error {
	data := map[string]any{
		"class":    string(class),
		"safeMode": string(policy.Mode),
		"unlocked": policy.Unlocked,
	}

	if policy.Unlocked {
		return nil
	}

	switch policy.Mode {
	case model.SafeModeSilent:
		return nil

	case model.SafeModeAlert:
		if confirmed {
			return nil
		}

		data["reason"] = "Safe Mode requires confirmation before running this query"
		data["requiresConfirm"] = true

		return apperror.SafeModeConfirmRequired(data)

	case model.SafeModeAlertWrite:
		if IsReadClass(class) {
			return nil
		}

		if confirmed {
			return nil
		}

		data["reason"] = confirmReason(class)
		data["requiresConfirm"] = true

		return apperror.SafeModeConfirmRequired(data)

	case model.SafeModeSafe:
		if confirmed {
			return nil
		}

		data["reason"] = "Safe Mode requires your database password before running this query"
		data["requiresPassword"] = true

		return apperror.SafeModePasswordRequired(data)

	case model.SafeModeSafeWrite:
		if IsReadClass(class) {
			return nil
		}

		if confirmed {
			return nil
		}

		data["reason"] = "Safe Mode requires your database password before running this query"
		data["requiresPassword"] = true

		return apperror.SafeModePasswordRequired(data)

	default:
		return nil
	}
}

func confirmReason(class sqlguard.Class) string {
	switch class {
	case sqlguard.ClassCatastrophicDDL:
		return "destructive DDL requires confirmation"
	case sqlguard.ClassDangerousDML:
		return "DELETE/UPDATE without WHERE requires confirmation"
	case sqlguard.ClassDDL:
		return "DDL requires confirmation under Safe Mode"
	case sqlguard.ClassWriteDML:
		return "write statements require confirmation under Safe Mode"
	default:
		return "this query requires confirmation under Safe Mode"
	}
}

// UnlockStore manages time-boxed Safe Mode unlocks.
type UnlockStore struct {
	cache cache.Cache
}

func NewUnlockStore(c cache.Cache) *UnlockStore {
	return &UnlockStore{cache: c}
}

type unlockRecord struct {
	Until time.Time `json:"until"`
}

func UnlockKey(ownerID string, connectionID uint) string {
	return fmt.Sprintf("safe_mode_unlock:%s:%d", ownerID, connectionID)
}

func (s *UnlockStore) Unlock(ctx context.Context, ownerID string, connectionID uint, ttl time.Duration) (time.Time, error) {
	if s == nil || s.cache == nil {
		return time.Time{}, apperror.InternalServerError(fmt.Errorf("unlock store unavailable"))
	}

	if ttl < MinUnlockTTL {
		ttl = DefaultUnlockTTL
	}

	if ttl > MaxUnlockTTL {
		ttl = MaxUnlockTTL
	}

	until := time.Now().UTC().Add(ttl)

	rec := unlockRecord{Until: until}
	if err := s.cache.Set(ctx, UnlockKey(ownerID, connectionID), rec, &ttl); err != nil {
		return time.Time{}, err
	}

	return until, nil
}

func (s *UnlockStore) Clear(ctx context.Context, ownerID string, connectionID uint) error {
	if s == nil || s.cache == nil {
		return nil
	}

	return s.cache.Delete(ctx, UnlockKey(ownerID, connectionID))
}

func (s *UnlockStore) IsUnlocked(ctx context.Context, ownerID string, connectionID uint) (bool, *time.Time) {
	if s == nil || s.cache == nil {
		return false, nil
	}

	var rec unlockRecord
	if err := s.cache.Get(ctx, UnlockKey(ownerID, connectionID), &rec); err != nil {
		return false, nil
	}

	if rec.Until.IsZero() || time.Now().UTC().After(rec.Until) {
		return false, nil
	}

	until := rec.Until

	return true, &until
}

func (s *UnlockStore) WithUnlock(ctx context.Context, ownerID string, connectionID uint, policy Policy) Policy {
	unlocked, until := s.IsUnlocked(ctx, ownerID, connectionID)
	policy.Unlocked = unlocked
	policy.UnlockedUntil = until

	return policy
}
