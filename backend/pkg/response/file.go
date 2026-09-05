package response

import (
	"mime"
	"path/filepath"

	"github.com/gofiber/fiber/v3"
)

// FileDownload is the transport-neutral result of a file-serving service;
// handlers hand it to Send, which sets the attachment headers.
type FileDownload struct {
	FileName    string
	ContentType string
	Content     []byte
}

func (f FileDownload) Send(c fiber.Ctx) error {
	fileName := f.FileName
	if fileName == "" {
		fileName = "download"
	}

	contentType := f.ContentType
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	c.Set("Content-Disposition", "attachment; filename="+fileName)
	c.Set("Content-Type", contentType)

	return c.Send(f.Content)
}

// ContentTypeByExtension infers a mime type from a file name, falling back to
// application/octet-stream.
func ContentTypeByExtension(fileName string) string {
	if t := mime.TypeByExtension(filepath.Ext(fileName)); t != "" {
		return t
	}

	return "application/octet-stream"
}
