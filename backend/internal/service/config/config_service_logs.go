package serviceConfig

import (
	"context"
	"errors"
	"os"
	"path/filepath"

	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/response"
)

func (i IConfigServiceImpl) Logs(_ context.Context) (*response.FileDownload, error) {
	filePath := i.cfg.App.LogPath
	if filePath == "" {
		return nil, apperror.BadRequest(errors.New("file path not found"))
	}

	fileContent, err := os.ReadFile(filePath)
	if err != nil {
		return nil, apperror.BadRequest(errors.New("failed to read file"))
	}

	return &response.FileDownload{
		FileName:    filepath.Base(filePath),
		ContentType: response.ContentTypeByExtension(filePath),
		Content:     fileContent,
	}, nil
}
