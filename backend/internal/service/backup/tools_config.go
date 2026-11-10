package serviceBackup

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/helper"
)

const (
	// ToolSourceConfigured is a binary the user pointed DBO at.
	ToolSourceConfigured = "configured"
	// ToolSourceKnown is a binary found in a well-known install directory
	// (Homebrew, Postgres.app, distro packages) that is not on PATH.
	ToolSourceKnown = "known"
)

var (
	ErrToolUnknown  = errors.New("unknown tool")
	ErrToolPath     = errors.New("tool path must be an absolute path to an executable file")
	ErrToolMismatch = errors.New("file name does not match the tool")

	toolPathsMu sync.Mutex
)

// toolPathsFile keeps per-tool overrides next to the managed tools. Overrides
// are host-wide, like installs, so a file is enough and needs no migration.
func toolPathsFile() string {
	return filepath.Join(helper.ToolsDir, "paths.json")
}

func loadToolPaths() map[string]string {
	paths := map[string]string{}

	data, err := os.ReadFile(toolPathsFile())
	if err != nil {
		return paths
	}

	_ = json.Unmarshal(data, &paths)

	return paths
}

func saveToolPaths(paths map[string]string) error {
	if err := os.MkdirAll(helper.ToolsDir, 0o755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(paths, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(toolPathsFile(), data, 0o600)
}

func driverOfTool(name string) (string, bool) {
	for _, group := range toolsByDriver {
		for _, n := range group.names {
			if n == name {
				return group.driver, true
			}
		}
	}

	return "", false
}

// TestToolPath checks that path is a runnable binary for the named tool and
// returns what it found. Nothing is stored. Only the fixed tool names are
// accepted, and the file must be called like the tool, so a stored path can
// never point exec at an arbitrary program.
func TestToolPath(ctx context.Context, name, path string) (dto.BackupTool, error) {
	driver, ok := driverOfTool(name)
	if !ok {
		return dto.BackupTool{}, ErrToolUnknown
	}

	path = filepath.Clean(strings.TrimSpace(path))
	if !filepath.IsAbs(path) {
		return dto.BackupTool{}, ErrToolPath
	}

	info, err := os.Stat(path)
	if err != nil || !info.Mode().IsRegular() {
		return dto.BackupTool{}, ErrToolPath
	}

	if runtime.GOOS != "windows" && info.Mode().Perm()&0o111 == 0 {
		return dto.BackupTool{}, ErrToolPath
	}

	if strings.TrimSuffix(strings.ToLower(filepath.Base(path)), ".exe") != name {
		return dto.BackupTool{}, ErrToolMismatch
	}

	tool := probeTool(ctx, driver, name, path, ToolSourceConfigured)
	if tool.Error != "" {
		return tool, fmt.Errorf("%s: %s", name, tool.Error)
	}

	return tool, nil
}

// SetToolPath validates and stores the override for one tool.
func SetToolPath(ctx context.Context, name, path string) (dto.BackupTool, error) {
	tool, err := TestToolPath(ctx, name, path)
	if err != nil {
		return tool, err
	}

	toolPathsMu.Lock()
	defer toolPathsMu.Unlock()

	paths := loadToolPaths()
	paths[name] = tool.Path

	return tool, saveToolPaths(paths)
}

// ClearToolPath removes the override so detection falls back to PATH and the
// install directories.
func ClearToolPath(name string) error {
	if _, ok := driverOfTool(name); !ok {
		return ErrToolUnknown
	}

	toolPathsMu.Lock()
	defer toolPathsMu.Unlock()

	paths := loadToolPaths()
	delete(paths, name)

	return saveToolPaths(paths)
}

// knownToolCandidates globs the usual install locations for name.
func knownToolCandidates(name string) []string {
	var patterns []string

	switch runtime.GOOS {
	case "darwin":
		patterns = []string{
			"/opt/homebrew/opt/libpq/bin", "/opt/homebrew/opt/postgresql@*/bin",
			"/usr/local/opt/libpq/bin", "/usr/local/opt/postgresql@*/bin",
			"/opt/homebrew/opt/mysql-client/bin", "/opt/homebrew/opt/mysql/bin",
			"/usr/local/opt/mysql-client/bin", "/usr/local/opt/mysql/bin",
			"/Applications/Postgres.app/Contents/Versions/*/bin",
		}
	case "windows":
		patterns = []string{
			`C:\Program Files\PostgreSQL\*\bin`,
			`C:\Program Files\MySQL\MySQL Server *\bin`,
		}
	default:
		patterns = []string{"/usr/lib/postgresql/*/bin", "/usr/local/pgsql/bin", "/usr/local/mysql/bin"}
	}

	file := name
	if runtime.GOOS == "windows" {
		file += ".exe"
	}

	var found []string

	for _, pattern := range patterns {
		dirs, err := filepath.Glob(pattern)
		if err != nil {
			continue
		}

		for _, dir := range dirs {
			p := filepath.Join(dir, file)
			if info, err := os.Stat(p); err == nil && info.Mode().IsRegular() {
				found = append(found, p)
			}
		}
	}

	return found
}

// sameFile reports whether two paths resolve to one binary, so a tool found on
// PATH and in a known directory is listed once.
func sameFile(a, b string) bool {
	ra, errA := filepath.EvalSymlinks(a)
	rb, errB := filepath.EvalSymlinks(b)

	return errA == nil && errB == nil && ra == rb
}
