package serviceBackup

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDrillNamesAndGuards(t *testing.T) {
	name, err := DrillDatabaseName(42)
	if err != nil || !IsDrillDatabase(name) || !strings.HasPrefix(name, "dbo_drill_42_") {
		t.Fatalf("bad scratch name %q: %v", name, err)
	}

	other, _ := DrillDatabaseName(42)
	if name == other {
		t.Fatal("two scratch names must differ")
	}

	// A real database must never pass, however close it looks.
	for _, bad := range []string{"", "postgres", "mysql", "production", "dbo_drill_", "dbo_drill_1_xyz", "dbo_drill_1_abcdef12; DROP DATABASE x", "DBO_DRILL_1_abcdef12", "dbo_drill_1_abcdef123", "x dbo_drill_1_abcdef12"} {
		if IsDrillDatabase(bad) {
			t.Errorf("%q passed the guard", bad)
		}

		if _, err := DropDrillSQL("postgresql", bad, true); !errors.Is(err, ErrNotDrillDatabase) {
			t.Errorf("drop of %q was not refused: %v", bad, err)
		}

		if _, err := CreateDrillSQL("mysql", bad); !errors.Is(err, ErrNotDrillDatabase) {
			t.Errorf("create of %q was not refused: %v", bad, err)
		}
	}
}

func TestDrillStatements(t *testing.T) {
	const n = "dbo_drill_7_0a1b2c3d"

	cases := []struct{ driver, got, want string }{
		{"postgresql", must(CreateDrillSQL("postgresql", n)), `CREATE DATABASE "dbo_drill_7_0a1b2c3d"`},
		{"mysql", must(CreateDrillSQL("mysql", n)), "CREATE DATABASE `dbo_drill_7_0a1b2c3d`"},
		{"postgresql", must(DropDrillSQL("postgresql", n, true)), `DROP DATABASE "dbo_drill_7_0a1b2c3d" WITH (FORCE)`},
		{"postgresql", must(DropDrillSQL("postgresql", n, false)), `DROP DATABASE "dbo_drill_7_0a1b2c3d"`},
		{"mysql", must(DropDrillSQL("mysql", n, true)), "DROP DATABASE `dbo_drill_7_0a1b2c3d`"},
	}

	for _, c := range cases {
		if c.got != c.want {
			t.Errorf("%s: got %s, want %s", c.driver, c.got, c.want)
		}
	}
}

func must(s string, err error) string {
	if err != nil {
		panic(err)
	}

	return s
}

func TestTableCountSQL(t *testing.T) {
	if got := TableCountSQL("mysql", "shop'; DROP", ""); !strings.Contains(got, "'shop''; DROP'") {
		t.Errorf("database name not escaped: %s", got)
	}

	if got := TableCountSQL("postgresql", "", "public"); !strings.Contains(got, "table_schema = 'public'") {
		t.Errorf("schema filter missing: %s", got)
	}

	if got := TableCountSQL("postgresql", "", ""); !strings.Contains(got, "NOT IN ('pg_catalog'") {
		t.Errorf("whole-database count must skip system schemas: %s", got)
	}
}

func TestCountCreateTables(t *testing.T) {
	dump := "-- dump\nCREATE TABLE public.a (\n  id int\n);\n/*!50001 CREATE TABLE `view_standin` (x int) */;\nINSERT INTO a VALUES (1);\nCREATE TABLE `b` (\n  id int\n);\n" +
		"INSERT INTO b VALUES ('" + strings.Repeat("x", 3<<20) + " CREATE TABLE inside a long line');\nCREATE TABLE c (id int);\n"
	path := filepath.Join(t.TempDir(), "d.sql")

	if err := os.WriteFile(path, []byte(dump), 0o600); err != nil {
		t.Fatal(err)
	}

	got, err := CountCreateTables(path)
	if err != nil || got != 3 {
		t.Fatalf("counted %d tables (%v), want 3: the indented stand-in and the text inside a long line must not count", got, err)
	}
}
