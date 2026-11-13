package handler

import (
	"bufio"
	"context"
	"io"
	"mime"
	"strconv"
	"sync"
	"time"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	serviceNoSQL "github.com/dbo-studio/dbo/internal/service/nosql"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/goccy/go-json"
	"github.com/gofiber/fiber/v3"
)

// serverBody is every field a server-level call may take; each endpoint reads the ones it needs.
type serverBody struct {
	ConnectionID int32                      `json:"connectionId"`
	Database     string                     `json:"database"`
	Name         string                     `json:"name"`
	Collection   string                     `json:"collection"`
	Bucket       string                     `json:"bucket"`
	ID           string                     `json:"id"`
	Options      contract.CollectionOptions `json:"options"`
	Confirmed    bool                       `json:"confirmed"`
}

// serverRead runs a read on the connection named in the query string.
func (h *NoSQLHandler) serverRead(c fiber.Ctx, fn func(t contract.ServerTools, c fiber.Ctx) (any, error)) error {
	id := fiber.Query[int32](c, "connectionId")
	if id < 1 {
		return response.ErrorBuilder().FromError(apperror.BadRequest(errMissingConnection)).Send(c)
	}

	out, err := h.service.ServerCall(c, id, serviceNoSQL.ServerRead, false, func(t contract.ServerTools) (any, error) { return fn(t, c) })
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(out).Send(c)
}

// serverWrite runs a write or destructive call described by a JSON body.
func (h *NoSQLHandler) serverWrite(c fiber.Ctx, kind string, fn func(t contract.ServerTools, b *serverBody) (any, error)) error {
	b := new(serverBody)
	if err := c.Bind().Body(b); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if b.ConnectionID < 1 {
		return response.ErrorBuilder().FromError(apperror.BadRequest(errMissingConnection)).Send(c)
	}

	out, err := h.service.ServerCall(c, b.ConnectionID, kind, b.Confirmed, func(t contract.ServerTools) (any, error) { return fn(t, b) })
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(out).Send(c)
}

func (h *NoSQLHandler) ServerStatus(c fiber.Ctx) error {
	return h.serverRead(c, func(t contract.ServerTools, _ fiber.Ctx) (any, error) { return t.Server(c) })
}

func (h *NoSQLHandler) ServerOperations(c fiber.Ctx) error {
	return h.serverRead(c, func(t contract.ServerTools, _ fiber.Ctx) (any, error) { return t.Operations(c) })
}

func (h *NoSQLHandler) ServerDatabases(c fiber.Ctx) error {
	return h.serverRead(c, func(t contract.ServerTools, _ fiber.Ctx) (any, error) { return t.Databases(c) })
}

func (h *NoSQLHandler) ServerCollections(c fiber.Ctx) error {
	return h.serverRead(c, func(t contract.ServerTools, _ fiber.Ctx) (any, error) { return t.Collections(c, c.Query("database")) })
}

func (h *NoSQLHandler) ServerUsers(c fiber.Ctx) error {
	return h.serverRead(c, func(t contract.ServerTools, _ fiber.Ctx) (any, error) { return t.Users(c) })
}

func (h *NoSQLHandler) GridFSBuckets(c fiber.Ctx) error {
	return h.serverRead(c, func(t contract.ServerTools, _ fiber.Ctx) (any, error) { return t.GridFSBuckets(c, c.Query("database")) })
}

func (h *NoSQLHandler) GridFSFiles(c fiber.Ctx) error {
	return h.serverRead(c, func(t contract.ServerTools, _ fiber.Ctx) (any, error) {
		return t.GridFSFiles(c, c.Query("database"), c.Query("bucket"), fiber.Query[int](c, "limit"))
	})
}

func (h *NoSQLHandler) ServerKill(c fiber.Ctx) error {
	return h.serverWrite(c, serviceNoSQL.ServerDestructive, func(t contract.ServerTools, b *serverBody) (any, error) {
		return nil, t.KillOperation(c, b.ID)
	})
}

func (h *NoSQLHandler) ServerCreateDatabase(c fiber.Ctx) error {
	return h.serverWrite(c, serviceNoSQL.ServerWrite, func(t contract.ServerTools, b *serverBody) (any, error) {
		return nil, t.CreateDatabase(c, b.Name, b.Collection)
	})
}

func (h *NoSQLHandler) ServerDropDatabase(c fiber.Ctx) error {
	return h.serverWrite(c, serviceNoSQL.ServerDestructive, func(t contract.ServerTools, b *serverBody) (any, error) {
		return nil, t.DropDatabase(c, b.Name)
	})
}

func (h *NoSQLHandler) ServerCreateCollection(c fiber.Ctx) error {
	return h.serverWrite(c, serviceNoSQL.ServerWrite, func(t contract.ServerTools, b *serverBody) (any, error) {
		return nil, t.CreateCollectionWith(c, b.Database, b.Name, b.Options)
	})
}

func (h *NoSQLHandler) GridFSDelete(c fiber.Ctx) error {
	return h.serverWrite(c, serviceNoSQL.ServerDestructive, func(t contract.ServerTools, b *serverBody) (any, error) {
		return nil, t.GridFSDelete(c, b.Database, b.Bucket, b.ID)
	})
}

// GridFSDownload streams one file out.
func (h *NoSQLHandler) GridFSDownload(c fiber.Ctx) error {
	id := fiber.Query[int32](c, "connectionId")
	if id < 1 {
		return response.ErrorBuilder().FromError(apperror.BadRequest(errMissingConnection)).Send(c)
	}

	reader, file, err := h.service.GridFSOpen(c, id, c.Query("database"), c.Query("bucket"), c.Query("id"))
	if err != nil {
		return h.fail(c, err)
	}

	name := file.Filename
	if name == "" {
		name = c.Query("id")
	}

	c.Set("Content-Type", "application/octet-stream")
	c.Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": name}))
	c.Set("Content-Length", strconv.FormatInt(file.Length, 10))

	return c.SendStreamWriter(func(w *bufio.Writer) {
		defer reader.Close()

		_, _ = io.Copy(w, reader)
	})
}

// ChangeStream streams change events of one collection as NDJSON until the client leaves.
func (h *NoSQLHandler) ChangeStream(c fiber.Ctx) error {
	id := fiber.Query[int32](c, "connectionId")
	container := c.Query("containerId")

	if id < 1 || container == "" {
		return response.ErrorBuilder().FromError(apperror.BadRequest(errMissingConnection)).Send(c)
	}

	c.Set("Content-Type", "application/x-ndjson")
	c.Set("Cache-Control", "no-cache")
	c.Set("X-Accel-Buffering", "no")

	streamCtx := c.Context()

	return c.SendStreamWriter(func(w *bufio.Writer) {
		// A failed write is the disconnect signal, as for Pub/Sub.
		ctx, cancel := context.WithCancel(streamCtx)
		defer cancel()

		var mu sync.Mutex

		emit := func(v any) error {
			mu.Lock()
			defer mu.Unlock()

			if ctx.Err() != nil {
				return ctx.Err()
			}

			data, err := json.Marshal(v)
			if err == nil {
				_, err = w.Write(append(data, '\n'))
			}

			if err == nil {
				err = w.Flush()
			}

			if err != nil {
				cancel()
			}

			return err
		}

		go func() {
			t := time.NewTicker(streamPingInterval)
			defer t.Stop()

			for {
				select {
				case <-ctx.Done():
					return
				case <-t.C:
					_ = emit(map[string]string{"type": "ping"})
				}
			}
		}()

		err := h.service.WatchChanges(ctx, id, container, func(e contract.ChangeEvent) error {
			return emit(map[string]string{"type": "change", "op": e.Op, "key": e.Key, "doc": e.Doc, "at": e.At})
		})
		if err != nil && ctx.Err() == nil {
			_ = emit(map[string]string{"type": "error", "message": err.Error()})
		}
	})
}
