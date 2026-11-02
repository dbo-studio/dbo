package serviceBackup

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestToolPathRejectsBadInput(t *testing.T) {
	ctx := context.Background()
	dir := t.TempDir()

	cases := []struct {
		name, tool, path string
		want             error
	}{
		{"unknown tool", "rm", "/bin/rm", ErrToolUnknown},
		{"relative", "pg_dump", "relative/pg_dump", ErrToolPath},
		{"directory", "pg_dump", dir, ErrToolPath},
	}

	if runtime.GOOS != "windows" {
		wrongName := filepath.Join(dir, "other")
		_ = os.WriteFile(wrongName, []byte("#!/bin/sh\n"), 0o755)
		notExec := filepath.Join(dir, "pg_dump")
		_ = os.WriteFile(notExec, []byte("#!/bin/sh\n"), 0o644)

		cases = append(cases,
			struct {
				name, tool, path string
				want             error
			}{"wrong name", "pg_dump", wrongName, ErrToolMismatch},
			struct {
				name, tool, path string
				want             error
			}{"not executable", "pg_dump", notExec, ErrToolPath},
		)
	}

	for _, c := range cases {
		if _, err := TestToolPath(ctx, c.tool, c.path); !errors.Is(err, c.want) {
			t.Errorf("%s: got %v, want %v", c.name, err, c.want)
		}
	}
}

func TestToolPathAcceptsWorkingBinary(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("shell script stub")
	}

	p := filepath.Join(t.TempDir(), "mysqldump")
	if err := os.WriteFile(p, []byte("#!/bin/sh\necho 'mysqldump  Ver 8.0.36'\n"), 0o755); err != nil {
		t.Fatal(err)
	}

	tool, err := TestToolPath(context.Background(), "mysqldump", p)
	if err != nil {
		t.Fatal(err)
	}

	if tool.Version != "8.0.36" || tool.Source != ToolSourceConfigured {
		t.Fatalf("unexpected tool: %+v", tool)
	}
}
