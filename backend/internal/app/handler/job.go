package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceJob "github.com/dbo-studio/dbo/internal/service/job"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type JobHandler struct {
	logger     logger.Logger
	jobService serviceJob.IJobService
}

func NewJobHandler(logger logger.Logger, jobService serviceJob.IJobService) *JobHandler {
	return &JobHandler{
		logger:     logger,
		jobService: jobService,
	}
}

func (h JobHandler) Detail(c fiber.Ctx) error {
	req := &dto.JobDetailRequest{
		JobId: fiber.Params[int32](c, "id"),
	}

	job, err := h.jobService.Detail(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().WithData(job).Send(c)
}

func (h JobHandler) Cancel(c fiber.Ctx) error {
	req := &dto.JobDetailRequest{
		JobId: fiber.Params[int32](c, "id"),
	}

	err := h.jobService.Cancel(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return response.SuccessBuilder().Send(c)
}

func (h JobHandler) Result(c fiber.Ctx) error {
	req := &dto.JobDetailRequest{
		JobId: fiber.Params[int32](c, "id"),
	}

	err := h.jobService.Result(c, req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder().FromError(err).Send(c)
	}

	return nil
}
