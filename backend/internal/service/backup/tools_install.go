package serviceBackup

import (
	"archive/zip"
	"context"
	"crypto/sha256"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

// toolManifestJSON pins every downloadable tool: official HTTPS source, exact
// size and SHA-256 per OS and architecture. Nothing outside it is ever
// fetched, and nothing is fetched without an explicit install request.
//
//go:embed tools_manifest.json
var toolManifestJSON []byte

const (
	toolDownloadTimeout = 15 * time.Minute
	// maxToolFileSize caps a single extracted file (zip-bomb guard).
	maxToolFileSize = 1 << 30
)

var (
	ErrToolNotInManifest = errors.New("no pinned download for this tool on this platform")
	ErrToolChecksum      = errors.New("downloaded file failed checksum verification")
	ErrToolUnsupported   = errors.New("unsupported tool archive")

	pathSegmentPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]*$`)
)

type toolManifestEntry struct {
	Driver  string   `json:"driver"`
	Version string   `json:"version"`
	OS      string   `json:"os"`
	Arch    string   `json:"arch"`
	URL     string   `json:"url"`
	SHA256  string   `json:"sha256"`
	Size    int64    `json:"size"`
	Archive string   `json:"archive"`
	Tools   []string `json:"tools"`
}

func loadManifest() ([]toolManifestEntry, error) {
	var entries []toolManifestEntry
	if err := json.Unmarshal(toolManifestJSON, &entries); err != nil {
		return nil, fmt.Errorf("invalid tool manifest: %w", err)
	}

	return entries, nil
}

// manifestForHost returns the entries that match this OS and architecture.
func manifestForHost() ([]toolManifestEntry, error) {
	entries, err := loadManifest()
	if err != nil {
		return nil, err
	}

	return lo.Filter(entries, func(e toolManifestEntry, _ int) bool {
		return e.OS == runtime.GOOS && e.Arch == runtime.GOARCH
	}), nil
}

// ToolDownloads lists what can be downloaded on this host, with source URL and
// size so the user sees both before agreeing.
func ToolDownloads() ([]dto.BackupToolDownload, error) {
	entries, err := manifestForHost()
	if err != nil {
		return nil, err
	}

	return lo.Map(entries, func(e toolManifestEntry, _ int) dto.BackupToolDownload {
		return dto.BackupToolDownload{
			Driver:    e.Driver,
			Version:   e.Version,
			Tools:     e.Tools,
			URL:       e.URL,
			Size:      e.Size,
			Installed: installedDir(e) != "",
		}
	}), nil
}

// installedDir returns the install directory when the entry is installed.
func installedDir(e toolManifestEntry) string {
	dir := toolDir(e.Driver, e.Version)

	for _, name := range e.Tools {
		if _, err := os.Stat(filepath.Join(dir, toolFileName(name))); err != nil {
			return ""
		}
	}

	return dir
}

func toolDir(driver, version string) string {
	return filepath.Join(helper.ToolsDir, driver, version)
}

func toolFileName(name string) string {
	if runtime.GOOS == "windows" {
		return name + ".exe"
	}

	return name
}

// InstallTool downloads one pinned tool, verifies size and checksum, extracts
// only the named binaries into data/tools/<driver>/<version>/ and confirms they
// run. A failed install leaves nothing behind.
func InstallTool(ctx context.Context, driver, version string, progress func(percent int, message string)) error {
	entries, err := manifestForHost()
	if err != nil {
		return err
	}

	entry, ok := lo.Find(entries, func(e toolManifestEntry) bool {
		return e.Driver == driver && e.Version == version
	})
	if !ok {
		return ErrToolNotInManifest
	}

	if !strings.HasPrefix(entry.URL, "https://") {
		return fmt.Errorf("%w: download must use https", ErrToolUnsupported)
	}

	root := filepath.Join(helper.ToolsDir, ".staging")
	if err := os.MkdirAll(root, 0o755); err != nil {
		return err
	}

	staging, err := os.MkdirTemp(root, driver+"-")
	if err != nil {
		return err
	}

	defer func() { _ = os.RemoveAll(staging) }()

	archivePath := filepath.Join(staging, "archive")

	progress(5, "Downloading "+entry.URL)

	if err := downloadVerified(ctx, entry, archivePath); err != nil {
		return err
	}

	progress(70, "Checksum verified")

	extracted := filepath.Join(staging, "out")
	if err := os.MkdirAll(extracted, 0o755); err != nil {
		return err
	}

	switch entry.Archive {
	case "zip":
		err = extractZip(archivePath, extracted, entry.Tools)
	default:
		err = ErrToolUnsupported
	}

	if err != nil {
		return err
	}

	for _, name := range entry.Tools {
		if probe := probeTool(ctx, driver, name, filepath.Join(extracted, toolFileName(name)), ToolSourceManaged); probe.Error != "" {
			return fmt.Errorf("%s did not run after install: %s", name, probe.Error)
		}
	}

	dest := toolDir(driver, version)
	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		return err
	}

	if err := os.RemoveAll(dest); err != nil {
		return err
	}

	progress(95, "Installing")

	return os.Rename(extracted, dest)
}

func downloadVerified(ctx context.Context, entry toolManifestEntry, dest string) error {
	ctx, cancel := context.WithTimeout(ctx, toolDownloadTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, entry.URL, nil)
	if err != nil {
		return err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("download failed: %w", err)
	}

	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download failed: %s", resp.Status)
	}

	f, err := os.Create(dest)
	if err != nil {
		return err
	}

	defer func() { _ = f.Close() }()

	h := sha256.New()

	// Read one byte past the pinned size so a longer body is caught.
	n, err := io.Copy(io.MultiWriter(f, h), io.LimitReader(resp.Body, entry.Size+1))
	if err != nil {
		return fmt.Errorf("download failed: %w", err)
	}

	if n != entry.Size || hex.EncodeToString(h.Sum(nil)) != entry.SHA256 {
		return ErrToolChecksum
	}

	return nil
}

// extractZip writes only the wanted tool binaries, flattened into dest. Entry
// names from the archive are never used as paths.
func extractZip(archivePath, dest string, tools []string) error {
	zr, err := zip.OpenReader(archivePath)
	if err != nil {
		return err
	}

	defer func() { _ = zr.Close() }()

	want := lo.SliceToMap(tools, func(t string) (string, bool) { return toolFileName(t), true })
	found := 0

	for _, f := range zr.File {
		base := filepath.Base(f.Name)
		if f.FileInfo().IsDir() || !want[base] {
			continue
		}

		if err := extractZipFile(f, filepath.Join(dest, base)); err != nil {
			return err
		}

		found++
	}

	if found != len(tools) {
		return fmt.Errorf("%w: expected %d tool(s), found %d", ErrToolUnsupported, len(tools), found)
	}

	return nil
}

func extractZipFile(f *zip.File, dest string) error {
	rc, err := f.Open()
	if err != nil {
		return err
	}

	defer func() { _ = rc.Close() }()

	out, err := os.OpenFile(dest, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o755)
	if err != nil {
		return err
	}

	n, err := io.Copy(out, io.LimitReader(rc, maxToolFileSize+1))
	if closeErr := out.Close(); err == nil {
		err = closeErr
	}

	if err != nil {
		return err
	}

	if n > maxToolFileSize {
		return fmt.Errorf("%w: file too large", ErrToolUnsupported)
	}

	return nil
}

// RemoveTool deletes one managed install. Driver and version must be plain
// path segments so the request can never leave the tool directory.
func RemoveTool(driver, version string) error {
	if !pathSegmentPattern.MatchString(driver) || !pathSegmentPattern.MatchString(version) {
		return ErrToolNotInManifest
	}

	dir := toolDir(driver, version)
	if _, err := os.Stat(dir); err != nil {
		return ErrToolNotInManifest
	}

	return os.RemoveAll(dir)
}
