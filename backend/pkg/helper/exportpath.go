package helper

import (
	"errors"
	"path/filepath"
	"strings"
)

const ExportDir = "exports"

var ErrExportPathOutsideRoot = errors.New("export path outside allowed directory")

// ValidateExportSavePath checks a client-supplied save path. Web callers must
// pass an empty path; desktop may supply an absolute path from the native save
// dialog (still rejects ".." segments).
func ValidateExportSavePath(savePath string, desktop bool) error {
	if savePath == "" {
		return nil
	}

	slashPath := filepath.ToSlash(savePath)
	for _, part := range strings.Split(slashPath, "/") {
		if part == ".." {
			return ErrExportPathOutsideRoot
		}
	}

	if !desktop {
		clean := filepath.Clean(savePath)
		if filepath.IsAbs(clean) {
			return ErrExportPathOutsideRoot
		}

		if _, err := ExportPathUnderRoot(savePath); err != nil {
			return err
		}
	}

	return nil
}

// ExportPathUnderRoot resolves savePath relative to ExportDir and ensures the
// result stays under the exports root. Used for web exports and job downloads.
func ExportPathUnderRoot(savePath string) (string, error) {
	root, err := filepath.Abs(ExportDir)
	if err != nil {
		return "", err
	}

	joined := savePath
	if !filepath.IsAbs(joined) {
		joined = filepath.Join(ExportDir, joined)
	}

	abs, err := filepath.Abs(filepath.Clean(joined))
	if err != nil {
		return "", err
	}

	if !pathWithinRoot(abs, root) {
		return "", ErrExportPathOutsideRoot
	}

	return abs, nil
}

// IsReadableExportResultPath reports whether filePath may be served via
// GET /jobs/:id/result (always constrained to ExportDir).
func IsReadableExportResultPath(filePath string) bool {
	if filePath == "" {
		return false
	}

	abs, err := filepath.Abs(filepath.Clean(filePath))
	if err != nil {
		return false
	}

	root, err := filepath.Abs(ExportDir)
	if err != nil {
		return false
	}

	return pathWithinRoot(abs, root)
}

func pathWithinRoot(absPath, root string) bool {
	rel, err := filepath.Rel(root, absPath)
	if err != nil {
		return false
	}

	return rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator))
}
