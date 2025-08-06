package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceTree "github.com/dbo-studio/dbo/internal/service/tree"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type TreeHandler struct {
	logger      logger.Logger
	treeService serviceTree.ITreeService
}

func NewTreeHandler(logger logger.Logger, treeService serviceTree.ITreeService) *TreeHandler {
	return &TreeHandler{logger, treeService}
}

func (h *TreeHandler) TreeHandler(c fiber.Ctx) error {
	req := new(dto.TreeListRequest)
	if err := c.Bind().Query(req); err != nil {
		return response.ErrorBuilder().FromError(apperror.BadRequest(err)).Send(c)
	}

	result, err := h.treeService.Tree(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *TreeHandler) Tabs(c fiber.Ctx) error {
	req := &dto.ObjectTabsRequest{
		ConnectionId: fiber.Query[int32](c, "connectionId"),
		Action:       fiber.Params[string](c, "action"),
		NodeId:       fiber.Params[string](c, "nodeId"),
	}

	result, err := h.treeService.Tabs(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *TreeHandler) ObjectFields(c fiber.Ctx) error {
	req := &dto.ObjectFieldsRequest{
		ConnectionId: fiber.Query[int32](c, "connectionId"),
		Action:       fiber.Params[string](c, "action"),
		NodeId:       fiber.Params[string](c, "nodeId"),
		TabId:        fiber.Params[string](c, "tabId"),
	}

	result, err := h.treeService.TabObject(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(result).Send(c)
}

func (h *TreeHandler) ObjectDetail(c fiber.Ctx) error {
	req := &dto.ObjectDetailRequest{
		ConnectionId: fiber.Query[int32](c, "connectionId"),
		NodeId:       fiber.Params[string](c, "nodeId"),
		TabId:        fiber.Params[string](c, "tabId"),
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
		ConnectionId: fiber.Query[int32](c, "connectionId"),
		NodeId:       fiber.Params[string](c, "nodeId"),
		Action:       fiber.Params[string](c, "action"),
		Params:       c.Body(),
	}

	err := h.treeService.ObjectExecute(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().Send(c)
}
