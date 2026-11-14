package txsession

import (
	"errors"
	"path/filepath"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func count(t *testing.T, db *gorm.DB) int {
	t.Helper()

	var n int
	if err := db.Raw("SELECT COUNT(*) FROM t").Scan(&n).Error; err != nil {
		t.Fatal(err)
	}

	return n
}

func TestStore(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "t.db")), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}

	if err := db.Exec("CREATE TABLE t (id INTEGER)").Error; err != nil {
		t.Fatal(err)
	}

	s := NewStore()
	key := Key{Owner: "o", ConnectionID: 1, Tab: "a"}

	if err := s.Use(key, func(*gorm.DB) error { return nil }); !errors.Is(err, ErrMissing) {
		t.Fatalf("Use without a transaction: %v", err)
	}

	for _, commit := range []bool{false, true} {
		if err := s.Begin(key, db); err != nil {
			t.Fatal(err)
		}

		if err := s.Begin(key, db); !errors.Is(err, ErrActive) {
			t.Fatalf("second Begin: %v", err)
		}

		before := count(t, db)

		if err := s.Use(key, func(tx *gorm.DB) error { return tx.Exec("INSERT INTO t VALUES (1)").Error }); err != nil {
			t.Fatal(err)
		}

		if err := s.End(key, commit); err != nil {
			t.Fatal(err)
		}

		want := before
		if commit {
			want++
		}

		if got := count(t, db); got != want {
			t.Fatalf("commit=%v: rows %d, want %d", commit, got, want)
		}

		if s.Active(key) {
			t.Fatal("still active after End")
		}
	}
}
