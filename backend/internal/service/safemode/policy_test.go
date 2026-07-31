package safemode

import (
	"testing"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/sqlguard"
	"github.com/samber/lo"
)

func TestApplyCreateDefaults(t *testing.T) {
	t.Parallel()

	t.Run("nil defaults to silent", func(t *testing.T) {
		t.Parallel()
		mode := ApplyCreateDefaults(nil)
		if mode != model.SafeModeSilent {
			t.Fatalf("got mode=%q", mode)
		}
	})

	t.Run("explicit mode is normalized", func(t *testing.T) {
		t.Parallel()
		mode := ApplyCreateDefaults(lo.ToPtr("alert2"))
		if mode != model.SafeModeAlertWrite {
			t.Fatalf("got mode=%q", mode)
		}
	})
}

func TestEnforce(t *testing.T) {
	t.Parallel()

	t.Run("silent allows writes", func(t *testing.T) {
		t.Parallel()
		err := Enforce(Policy{Mode: model.SafeModeSilent}, sqlguard.ClassWriteDML, false)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("alert requires confirm for select", func(t *testing.T) {
		t.Parallel()
		err := Enforce(Policy{Mode: model.SafeModeAlert}, sqlguard.ClassRead, false)
		if !apperror.Equals(err, apperror.ErrSafeModeConfirmRequired) {
			t.Fatalf("got %v, want confirm", err)
		}
	})

	t.Run("alert_write allows select", func(t *testing.T) {
		t.Parallel()
		err := Enforce(Policy{Mode: model.SafeModeAlertWrite}, sqlguard.ClassRead, false)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("alert_write requires confirm for write", func(t *testing.T) {
		t.Parallel()
		err := Enforce(Policy{Mode: model.SafeModeAlertWrite}, sqlguard.ClassWriteDML, false)
		if !apperror.Equals(err, apperror.ErrSafeModeConfirmRequired) {
			t.Fatalf("got %v, want confirm", err)
		}
	})

	t.Run("safe requires password", func(t *testing.T) {
		t.Parallel()
		err := Enforce(Policy{Mode: model.SafeModeSafe}, sqlguard.ClassRead, false)
		if !apperror.Equals(err, apperror.ErrSafeModePasswordRequired) {
			t.Fatalf("got %v, want password", err)
		}
	})

	t.Run("confirmed password gate passes", func(t *testing.T) {
		t.Parallel()
		err := Enforce(Policy{Mode: model.SafeModeSafeWrite}, sqlguard.ClassWriteDML, true)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})

	t.Run("unlocked bypasses gates", func(t *testing.T) {
		t.Parallel()
		err := Enforce(Policy{Mode: model.SafeModeSafe, Unlocked: true}, sqlguard.ClassWriteDML, false)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})
}
