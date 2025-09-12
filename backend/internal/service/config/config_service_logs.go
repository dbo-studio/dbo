package serviceConfig

import (
	"errors"
	"os"
	"strings"

	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/gofiber/fiber/v3"
)

func (i IConfigServiceImpl) Logs(ctx fiber.Ctx) error {
	filePath := i.cfg.App.LogPath
	if filePath == "" {
		return apperror.BadRequest(errors.New("file path not found"))
	}

	fileContent, err := os.ReadFile(filePath)
	if err != nil {
		return apperror.BadRequest(errors.New("failed to read file"))
	}

	filename := filePath[strings.LastIndex(filePath, "/")+1:]

	ctx.Set("Content-Disposition", "attachment; filename="+filename)
	ctx.Set("Content-Type", "application/octet-stream")

	return ctx.Send(fileContent)

}
