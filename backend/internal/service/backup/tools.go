package serviceBackup

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/helper"
)

const (
	ToolSourcePath    = "path"
	ToolSourceManaged = "managed"

	toolVersionTimeout = 5 * time.Second
)

// toolsByDriver lists the native binaries each driver's backup and restore
// use. Names are fixed, so nothing user-supplied reaches exec.
var toolsByDriver = []struct {
	driver string
	names  []string
}{
	{"postgresql", []string{"pg_dump", "pg_restore", "psql"}},
	{"mysql", []string{"mysqldump", "mysql"}},
	{"sqlite", []string{"sqlite3"}},
}

var versionPattern = regexp.MustCompile(`\d+(\.\d+)+`)

// DetectTools finds every known tool: the user's configured path first, then
// DBO's own tool directory (data/tools/<driver>/<version>/), PATH, and the
// usual install directories. Missing tools are listed with Found false so the
// UI can offer a download or a path field.
func DetectTools(ctx context.Context) []dto.BackupTool {
	tools := make([]dto.BackupTool, 0, 6)
	overrides := loadToolPaths()

	for _, group := range toolsByDriver {
		for _, name := range group.names {
			var seen []string

			add := func(path, source string) {
				for _, s := range seen {
					if sameFile(s, path) {
						return
					}
				}

				seen = append(seen, path)
				tools = append(tools, probeTool(ctx, group.driver, name, path, source))
			}

			if path, ok := overrides[name]; ok {
				add(path, ToolSourceConfigured)
			}

			for _, candidate := range managedCandidates(group.driver, name) {
				add(candidate, ToolSourceManaged)
			}

			if path, err := exec.LookPath(name); err == nil {
				add(path, ToolSourcePath)
			}

			for _, candidate := range knownToolCandidates(name) {
				add(candidate, ToolSourceKnown)
			}

			if len(seen) == 0 {
				tools = append(tools, dto.BackupTool{Driver: group.driver, Name: name})
			}
		}
	}

	return tools
}

// managedCandidates returns binaries installed under the tool directory, one
// per installed version.
func managedCandidates(driver, name string) []string {
	if runtime.GOOS == "windows" {
		name += ".exe"
	}

	base := filepath.Join(helper.ToolsDir, driver)

	versions, err := os.ReadDir(base)
	if err != nil {
		return nil
	}

	var paths []string

	for _, v := range versions {
		if !v.IsDir() {
			continue
		}

		for _, rel := range []string{name, filepath.Join("bin", name)} {
			p := filepath.Join(base, v.Name(), rel)
			if info, err := os.Stat(p); err == nil && !info.IsDir() {
				paths = append(paths, p)
				break
			}
		}
	}

	return paths
}

func probeTool(ctx context.Context, driver, name, path, source string) dto.BackupTool {
	tool := dto.BackupTool{Driver: driver, Name: name, Path: path, Source: source, Found: true}

	ctx, cancel := context.WithTimeout(ctx, toolVersionTimeout)
	defer cancel()

	out, err := exec.CommandContext(ctx, path, "--version").Output()
	if err != nil {
		tool.Error = "could not run --version"

		return tool
	}

	line, _, _ := strings.Cut(strings.TrimSpace(string(out)), "\n")
	tool.Version = versionPattern.FindString(line)

	if tool.Version == "" {
		tool.Error = "unrecognized --version output"
	}

	return tool
}
