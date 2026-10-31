package serviceNotification

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceEvents "github.com/dbo-studio/dbo/internal/service/events"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

const defaultPageSize = 30

// INotifier is what other services see: write an entry and wake the owner's streams.
type INotifier interface {
	Notify(ctx context.Context, n *model.Notification) error
}

type INotificationService interface {
	INotifier
	List(ctx context.Context, req *dto.NotificationListRequest) (*dto.NotificationListResponse, error)
	MarkRead(ctx context.Context, id uint) error
	MarkAllRead(ctx context.Context) error
	Delete(ctx context.Context, id uint) error
}

type INotificationServiceImpl struct {
	repo repository.INotificationRepo
	hub  serviceEvents.IHub
}

func NewNotificationService(repo repository.INotificationRepo, hub serviceEvents.IHub) INotificationService {
	return &INotificationServiceImpl{repo: repo, hub: hub}
}

func toResponse(n *model.Notification) dto.NotificationResponse {
	return dto.NotificationResponse{
		ID: n.ID, Kind: n.Kind, JobType: n.JobType, Title: n.Title, Body: n.Body, JobID: n.JobID,
		Read: n.ReadAt != nil, CreatedAt: n.CreatedAt,
	}
}

// Notify stores the entry for n.OwnerID, then tells that owner's open streams. A notification is written in
// the same place a job reaches its end, so there is exactly one per finished job.
func (s *INotificationServiceImpl) Notify(ctx context.Context, n *model.Notification) error {
	if err := s.repo.Create(ctx, n); err != nil {
		return err
	}

	s.hub.Publish(n.OwnerID, serviceEvents.Event{Type: "notification.created", Data: toResponse(n)})

	return nil
}

func (s *INotificationServiceImpl) List(ctx context.Context, req *dto.NotificationListRequest) (*dto.NotificationListResponse, error) {
	owner := helper.CtxOwnerID(ctx)
	limit := lo.Ternary(req.Limit == 0, defaultPageSize, req.Limit)

	items, err := s.repo.List(ctx, owner, limit, req.Offset)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	unread, err := s.repo.CountUnread(ctx, owner)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	out := &dto.NotificationListResponse{Items: make([]dto.NotificationResponse, 0, len(items)), Unread: unread}
	for i := range items {
		out.Items = append(out.Items, toResponse(&items[i]))
	}

	return out, nil
}

func (s *INotificationServiceImpl) MarkRead(ctx context.Context, id uint) error {
	return wrap(s.repo.MarkRead(ctx, helper.CtxOwnerID(ctx), id))
}

func (s *INotificationServiceImpl) MarkAllRead(ctx context.Context) error {
	return wrap(s.repo.MarkAllRead(ctx, helper.CtxOwnerID(ctx)))
}

func (s *INotificationServiceImpl) Delete(ctx context.Context, id uint) error {
	return wrap(s.repo.Delete(ctx, helper.CtxOwnerID(ctx), id))
}

func wrap(err error) error {
	if err == nil {
		return nil
	}

	return apperror.InternalServerError(err)
}
