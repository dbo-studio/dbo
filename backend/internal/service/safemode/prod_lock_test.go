package serviceSafemode

import (
	"errors"
	"testing"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/sqlguard"
)

func TestEnforceProdLock(t *testing.T) {
	prod := FromConnection(&model.Connection{Name: "live", Env: EnvProd, SafeMode: model.SafeModeSilent})

	if err := Enforce(prod, sqlguard.ClassRead, false); err != nil {
		t.Fatalf("read must pass on a locked prod connection: %v", err)
	}

	err := Enforce(prod, sqlguard.ClassWriteDML, true)
	if !errors.Is(err, apperror.ErrSafeModeProdLocked) {
		t.Fatalf("write on locked prod = %v, want prod locked even when confirmed", err)
	}

	prod.Unlocked = true
	if err := Enforce(prod, sqlguard.ClassWriteDML, false); err != nil {
		t.Fatalf("write after unlock: %v", err)
	}

	dev := FromConnection(&model.Connection{Env: "dev", SafeMode: model.SafeModeSilent})
	if err := Enforce(dev, sqlguard.ClassWriteDML, false); err != nil {
		t.Fatalf("dev write: %v", err)
	}
}
