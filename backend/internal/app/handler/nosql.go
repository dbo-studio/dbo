package handler

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/service/job/processors"
	serviceNoSQL "github.com/dbo-studio/dbo/internal/service/nosql"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/nosqlimport"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type NoSQLHandler struct {
	logger  logger.Logger
	service serviceNoSQL.INoSQLService
}

func NewNoSQLHandler(logger logger.Logger, service serviceNoSQL.INoSQLService) *NoSQLHandler {
	return &NoSQLHandler{logger: logger, service: service}
}

func (h *NoSQLHandler) fail(c fiber.Ctx, err error) error {
	h.logger.Error(err.Error())

	return response.ErrorBuilder().FromError(err).Send(c)
}

func (h *NoSQLHandler) Describe(c fiber.Ctx) error {
	req := &dto.NoSQLContainerRequest{
		ConnectionID: fiber.Query[int32](c, "connectionId"),
		ContainerID:  c.Query("containerId"),
	}
	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.service.Describe(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *NoSQLHandler) Browse(c fiber.Ctx) error {
	req := &dto.NoSQLBrowseRequest{
		ConnectionID: fiber.Query[int32](c, "connectionId"),
		ContainerID:  c.Query("containerId"),
		Query: contract.BrowseQuery{
			Cursor:     c.Query("cursor"),
			Limit:      fiber.Query[int](c, "limit"),
			Filter:     c.Query("filter"),
			Projection: c.Query("projection"),
		},
	}
	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	// sorts arrive as JSON: [{"field":"name","desc":true}]
	if raw := c.Query("sorts"); raw != "" {
		if err := json.Unmarshal([]byte(raw), &req.Query.Sorts); err != nil {
			return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
		}
	}

	if raw := c.Query("filters"); raw != "" {
		if err := json.Unmarshal([]byte(raw), &req.Query.Filters); err != nil {
			return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
		}
	}

	result, err := h.service.Browse(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *NoSQLHandler) Get(c fiber.Ctx) error {
	req := &dto.NoSQLItemRequest{
		ConnectionID: fiber.Query[int32](c, "connectionId"),
		ContainerID:  c.Query("containerId"),
		ItemID:       c.Query("itemId"),
	}
	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.service.Get(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *NoSQLHandler) Save(c fiber.Ctx) error {
	req := new(dto.NoSQLSaveRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	if err := h.service.Save(c, req); err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().Send(c)
}

func (h *NoSQLHandler) Insert(c fiber.Ctx) error {
	req := new(dto.NoSQLInsertRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	id, err := h.service.Insert(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(map[string]string{"id": id}).Send(c)
}

func (h *NoSQLHandler) Delete(c fiber.Ctx) error {
	req := new(dto.NoSQLDeleteRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	if err := h.service.Delete(c, req); err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().Send(c)
}

func (h *NoSQLHandler) BulkDeletePreview(c fiber.Ctx) error {
	req := &dto.NoSQLBulkDeleteRequest{
		ConnectionID: fiber.Query[int32](c, "connectionId"),
		ContainerID:  c.Query("containerId"),
		Pattern:      c.Query("pattern"),
		ConfirmName:  "-", // not used by the preview
	}
	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.service.BulkDeletePreview(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *NoSQLHandler) BulkDelete(c fiber.Ctx) error {
	req := new(dto.NoSQLBulkDeleteRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	id, err := h.service.BulkDelete(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(map[string]uint{"jobId": id}).Send(c)
}

func (h *NoSQLHandler) RunCommand(c fiber.Ctx) error {
	req := new(dto.NoSQLCommandRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.service.RunCommand(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *NoSQLHandler) PubSubChannels(c fiber.Ctx) error {
	req := &dto.NoSQLPubSubRequest{ConnectionID: fiber.Query[int32](c, "connectionId"), Pattern: c.Query("pattern")}
	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.service.PubSubChannels(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *NoSQLHandler) PubSubPublish(c fiber.Ctx) error {
	req := new(dto.NoSQLPubSubRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	n, err := h.service.PubSubPublish(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(map[string]string{"receivers": strconv.FormatInt(n, 10)}).Send(c)
}

// PubSubStream streams messages as NDJSON until the client goes away.
func (h *NoSQLHandler) PubSubStream(c fiber.Ctx) error {
	req := &dto.NoSQLPubSubRequest{ConnectionID: fiber.Query[int32](c, "connectionId")}
	chans := make([]string, 0)

	for _, v := range c.Request().URI().QueryArgs().PeekMulti("channel") {
		chans = append(chans, string(v))
	}

	req.Channels = chans
	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	c.Set("Content-Type", "application/x-ndjson")
	c.Set("Cache-Control", "no-cache")
	c.Set("X-Accel-Buffering", "no")

	streamCtx := c.Context()

	return c.SendStreamWriter(func(w *bufio.Writer) {
		// fasthttp does not cancel the request context on disconnect; a failed
		// write is the signal, so cancel to close the dedicated subscription.
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

		err := h.service.PubSubStream(ctx, req, func(m contract.Message) error {
			return emit(map[string]string{"type": "message", "channel": m.Channel, "payload": m.Payload})
		})
		if err != nil && ctx.Err() == nil {
			h.logger.Error(err.Error())
			_ = emit(map[string]string{"type": "error", "message": err.Error()})
		}
	})
}

func (h *NoSQLHandler) RecycleList(c fiber.Ctx) error {
	result, err := h.service.RecycleList(c, fiber.Query[int32](c, "connectionId"))
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *NoSQLHandler) RecycleRestore(c fiber.Ctx) error {
	req := &dto.NoSQLRecycleRestoreRequest{ConnectionID: fiber.Query[int32](c, "connectionId"), ID: uint(fiber.Params[int](c, "id"))}
	_ = c.Bind().Body(req)

	if err := h.service.RecycleRestore(c, req); err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().Send(c)
}

func (h *NoSQLHandler) Window(c fiber.Ctx) error {
	req := &dto.NoSQLWindowRequest{
		ConnectionID: fiber.Query[int32](c, "connectionId"),
		ContainerID:  c.Query("containerId"),
		ItemID:       c.Query("itemId"),
		Cursor:       c.Query("cursor"),
		Limit:        fiber.Query[int](c, "limit"),
	}
	if req.ConnectionID < 1 || req.ContainerID == "" || req.ItemID == "" {
		return response.ErrorBuilder().FromError(apperror.BadRequest(errors.New("connectionId, containerId and itemId are required"))).Send(c)
	}

	result, err := h.service.Window(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *NoSQLHandler) ApplyMember(c fiber.Ctx) error {
	req := new(dto.NoSQLMemberRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if req.ConnectionID < 1 || req.ContainerID == "" || req.ItemID == "" {
		return response.ErrorBuilder().FromError(apperror.BadRequest(errors.New("connectionId, containerId and itemId are required"))).Send(c)
	}

	if err := h.service.ApplyMember(c, req); err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().Send(c)
}

func (h *NoSQLHandler) Stats(c fiber.Ctx) error {
	req := &dto.NoSQLContainerRequest{
		ConnectionID: fiber.Query[int32](c, "connectionId"),
		ContainerID:  c.Query("containerId"),
	}
	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.service.Stats(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *NoSQLHandler) DocChildren(c fiber.Ctx) error {
	req := &dto.NoSQLDocChildrenRequest{
		ConnectionID: fiber.Query[int32](c, "connectionId"),
		ContainerID:  c.Query("containerId"),
		ItemID:       c.Query("itemId"),
		Offset:       fiber.Query[int](c, "offset"),
		Limit:        fiber.Query[int](c, "limit"),
	}
	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	// path arrives as a JSON array: ["items","0"]
	if raw := c.Query("path"); raw != "" {
		if err := json.Unmarshal([]byte(raw), &req.Path); err != nil {
			return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
		}
	}

	result, err := h.service.DocChildren(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *NoSQLHandler) docField(c fiber.Ctx, run func(fiber.Ctx, *dto.NoSQLDocFieldRequest) error) error {
	req := new(dto.NoSQLDocFieldRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	if err := run(c, req); err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().Send(c)
}

func (h *NoSQLHandler) DocSetField(c fiber.Ctx) error {
	return h.docField(c, func(c fiber.Ctx, r *dto.NoSQLDocFieldRequest) error { return h.service.DocSetField(c, r) })
}

func (h *NoSQLHandler) DocUnsetField(c fiber.Ctx) error {
	return h.docField(c, func(c fiber.Ctx, r *dto.NoSQLDocFieldRequest) error { return h.service.DocUnsetField(c, r) })
}

func (h *NoSQLHandler) Indexes(c fiber.Ctx) error {
	req := &dto.NoSQLContainerRequest{ConnectionID: fiber.Query[int32](c, "connectionId"), ContainerID: c.Query("containerId")}
	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.service.Indexes(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *NoSQLHandler) IndexCreate(c fiber.Ctx) error {
	req := new(dto.NoSQLIndexCreateRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	name, err := h.service.IndexCreate(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(map[string]string{"name": name}).Send(c)
}

func (h *NoSQLHandler) IndexDrop(c fiber.Ctx) error {
	req := new(dto.NoSQLIndexDropRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	if err := h.service.IndexDrop(c, req); err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().Send(c)
}

func (h *NoSQLHandler) Explain(c fiber.Ctx) error {
	req := &dto.NoSQLBrowseRequest{
		ConnectionID: fiber.Query[int32](c, "connectionId"),
		ContainerID:  c.Query("containerId"),
		Query:        contract.BrowseQuery{Filter: c.Query("filter")},
	}
	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	if raw := c.Query("sorts"); raw != "" {
		if err := json.Unmarshal([]byte(raw), &req.Query.Sorts); err != nil {
			return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
		}
	}

	result, err := h.service.Explain(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

// Aggregate is a POST because a pipeline is too large and too structured for a query string.
func (h *NoSQLHandler) Aggregate(c fiber.Ctx) error {
	req := new(dto.NoSQLAggregateRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.service.Aggregate(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *NoSQLHandler) Schema(c fiber.Ctx) error {
	req := &dto.NoSQLSchemaRequest{
		ConnectionID: fiber.Query[int32](c, "connectionId"),
		ContainerID:  c.Query("containerId"),
		Sample:       fiber.Query[int](c, "sample"),
	}
	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.service.Schema(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *NoSQLHandler) GetValidator(c fiber.Ctx) error {
	req := &dto.NoSQLContainerRequest{ConnectionID: fiber.Query[int32](c, "connectionId"), ContainerID: c.Query("containerId")}
	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.service.GetValidator(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *NoSQLHandler) SetValidator(c fiber.Ctx) error {
	req := new(dto.NoSQLValidatorRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	if err := h.service.SetValidator(c, req); err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().Send(c)
}

// Export streams the collection as NDJSON. The filter is checked before the first byte, so a bad one is a 400.
func (h *NoSQLHandler) Export(c fiber.Ctx) error {
	req := &dto.NoSQLExportRequest{
		ConnectionID: fiber.Query[int32](c, "connectionId"),
		ContainerID:  c.Query("containerId"),
		Filter:       c.Query("filter"),
	}
	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	it, err := h.service.ExportOpen(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	streamCtx := c.Context()
	asCSV := c.Query("format") == "csv"

	if asCSV {
		c.Set("Content-Type", "text/csv")
		c.Set("Content-Disposition", `attachment; filename="export.csv"`)
	} else {
		c.Set("Content-Type", "application/x-ndjson")
		c.Set("Content-Disposition", `attachment; filename="export.ndjson"`)
	}

	return c.SendStreamWriter(func(w *bufio.Writer) {
		defer it.Close(streamCtx)

		if asCSV {
			_, _ = serviceNoSQL.WriteCSV(streamCtx, it, w)

			return
		}

		for {
			line, ok, err := it.Next(streamCtx)
			if err != nil || !ok {
				return
			}

			if _, err := w.WriteString(line + "\n"); err != nil {
				return // client went away
			}
		}
	})
}

func (h *NoSQLHandler) Import(c fiber.Ctx) error {
	req := new(dto.NoSQLImportRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	n, err := h.service.Import(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(map[string]int{"inserted": n}).Send(c)
}

func (h *NoSQLHandler) CollectionRename(c fiber.Ctx) error {
	req := new(dto.NoSQLCollectionRenameRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	id, err := h.service.CollectionRename(c, req)
	if err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(map[string]string{"containerId": id}).Send(c)
}

func (h *NoSQLHandler) CollectionDrop(c fiber.Ctx) error {
	req := new(dto.NoSQLCollectionDropRequest)
	if err := c.Bind().Body(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	if err := h.service.CollectionDrop(c, req); err != nil {
		return h.fail(c, err)
	}

	return response.SuccessBuilder().Send(c)
}

// ImportUpload takes a file as multipart form data, spools it to disk and starts a background import. Nothing about the
// file is held in memory, and the client never names the path the job reads.
func (h *NoSQLHandler) ImportUpload(c fiber.Ctx) error {
	req := &dto.NoSQLImportStartRequest{
		ConnectionID: int32(parseInt(c.FormValue("connectionId"))),
		ContainerID:  c.FormValue("containerId"),
		Format:       c.FormValue("format"),
		Confirmed:    c.FormValue("confirmed") == "true",
	}

	if req.ConnectionID < 1 || req.ContainerID == "" {
		return response.ErrorBuilder().FromError(apperror.BadRequest(errors.New("connectionId and containerId are required"))).Send(c)
	}

	if req.Format != nosqlimport.FormatNDJSON && req.Format != nosqlimport.FormatJSON && req.Format != nosqlimport.FormatCSV {
		return response.ErrorBuilder().FromError(apperror.BadRequest(nosqlimport.ErrFormat)).Send(c)
	}

	file, err := c.FormFile("file")
	if err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(errors.New("a file is required"))).Send(c)
	}

	if file.Size > helper.MaxUploadSize {
		return response.ErrorBuilder().FromError(apperror.BadRequest(errors.New("the file is too large"))).Send(c)
	}

	tmp, err := os.CreateTemp("", processors.NoSQLImportTempPrefix+"*")
	if err != nil {
		return h.fail(c, apperror.InternalServerError(err))
	}

	req.Path = tmp.Name()
	_ = tmp.Close()

	if err := c.SaveFile(file, req.Path); err != nil {
		_ = os.Remove(req.Path)

		return h.fail(c, apperror.InternalServerError(err))
	}

	id, err := h.service.ImportStart(c, req)
	if err != nil {
		// The job never took the file, so it is removed here.
		_ = os.Remove(req.Path)

		return h.fail(c, err)
	}

	return response.SuccessBuilder().WithData(map[string]uint{"jobId": id}).Send(c)
}

var errMissingConnection = errors.New("connectionId is required")

func parseInt(s string) int {
	n, _ := strconv.Atoi(s)

	return n
}
