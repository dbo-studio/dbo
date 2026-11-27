package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceTree "github.com/dbo-studio/dbo/internal/service/tree"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
	"net/url"
)

type TreeHandler struct {
	logger      logger.Logger
	treeService serviceTree.ITreeService
}

func NewTreeHandler(logger logger.Logger, treeService serviceTree.ITreeService) *TreeHandler {
	return &TreeHandler{
		logger:      logger,
		treeService: treeService,
	}
}

func (h *TreeHandler) TreeHandler(c fiber.Ctx) error {
	req := new(dto.TreeListRequest)
	if err := c.Bind().Query(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.treeService.Tree(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *TreeHandler) Search(c fiber.Ctx) error {
	req := new(dto.TreeSearchRequest)
	if err := c.Bind().Query(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.treeService.Search(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *TreeHandler) Tabs(c fiber.Ctx) error {
	req := &dto.ObjectTabsRequest{
		ConnectionID: fiber.Query[int32](c, "connectionId"),
		Action:       fiber.Params[string](c, "action"),
		NodeID:       nodeParam(c),
	}

	result, err := h.treeService.Tabs(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *TreeHandler) ObjectDetail(c fiber.Ctx) error {
	req := &dto.ObjectDetailRequest{
		ConnectionID: fiber.Query[int32](c, "connectionId"),
		NodeID:       nodeParam(c),
		TabID:        fiber.Params[string](c, "tabId"),
		Action:       fiber.Params[string](c, "action"),
	}

	result, err := h.treeService.ObjectDetail(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *TreeHandler) ExecuteHandler(c fiber.Ctx) error {
	req := &dto.ObjectExecuteRequest{
		ConnectionID: fiber.Query[int32](c, "connectionId"),
		NodeID:       nodeParam(c),
		Action:       fiber.Params[string](c, "action"),
		Params:       c.Body(),
		Confirmed:    fiber.Query[bool](c, "confirmed"),
	}

	result, err := h.treeService.ObjectExecute(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *TreeHandler) PreviewExecuteHandler(c fiber.Ctx) error {
	req := &dto.ObjectExecuteRequest{
		ConnectionID: fiber.Query[int32](c, "connectionId"),
		NodeID:       nodeParam(c),
		Action:       fiber.Params[string](c, "action"),
		Params:       c.Body(),
	}

	queries, err := h.treeService.ObjectPreviewExecute(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(map[string][]string{"queries": queries}).Send(c)
}

func (h *TreeHandler) GetDynamicFieldOptions(c fiber.Ctx) error {
	req := &dto.DynamicFieldOptionsRequest{
		ConnectionID: fiber.Query[int32](c, "connectionId"),
		NodeID:       nodeParam(c),
		Parameters:   c.Queries(),
	}

	if err := req.Validate(); err != nil {
		return response.ErrorBuilder().FromError(apperror.Validation(err)).Send(c)
	}

	result, err := h.treeService.GetDynamicFieldOptions(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

// nodeParam reads the node id from the path. A NoSQL node id can hold a slash (db/collection), which the
// client sends as %2F so it stays one path segment.
func nodeParam(c fiber.Ctx) string {
	raw := fiber.Params[string](c, "nodeId")
	if id, err := url.PathUnescape(raw); err == nil {
		return id
	}

	return raw
}
