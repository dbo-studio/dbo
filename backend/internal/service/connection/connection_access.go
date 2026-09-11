package serviceConnection

import (
	"context"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/helper"
)

type connectionAccess struct {
	share   string
	isAdmin bool
}

func (s IConnectionServiceImpl) resolveAccess(ctx context.Context, connection *model.Connection) connectionAccess {
	ownerID := helper.CtxOwnerID(ctx)
	access := connectionAccess{
		isAdmin: helper.CtxUserRole(ctx) == string(model.UserRoleAdmin),
	}

	if connection.OwnerID == ownerID {
		access.share = "owner"

		return access
	}

	if helper.CtxUserID(ctx) == "" {
		return access
	}

	share, err := s.shareRepo.Find(ctx, connection.ID, ownerID)
	if err != nil {
		return access
	}

	access.share = share.Role

	return access
}

func (a connectionAccess) canUse() bool {
	return a.share == "owner" || a.share == model.ConnectionShareViewer || a.share == model.ConnectionShareEditor
}

func (a connectionAccess) canEdit() bool {
	return a.share == "owner" || a.share == model.ConnectionShareEditor
}

func (a connectionAccess) canManageShares() bool {
	return a.isAdmin
}

func (a connectionAccess) canDelete() bool {
	return a.share == "owner" || a.isAdmin
}

func (a connectionAccess) isOwner() bool {
	return a.share == "owner"
}

func sharingAvailable(ctx context.Context) bool {
	return helper.CtxUserID(ctx) != "" && helper.CtxOwnerID(ctx) != "desktop"
}
