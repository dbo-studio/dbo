package serviceConnection

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (s IConnectionServiceImpl) Index(ctx context.Context) (*dto.ConnectionsResponse, error) {
	connections, err := s.connectionRepo.Index(ctx)
	if err != nil {
		return nil, err
	}

	ownerID := helper.CtxOwnerID(ctx)

	return connectionsToResponse(ctx, ownerID, s.cm, s.unlockStore, connections, s.viewsFor(ctx, ownerID, connections)), nil
}

func (s IConnectionServiceImpl) viewsFor(ctx context.Context, ownerID string, connections *[]model.Connection) map[uint]connectionView {
	views := make(map[uint]connectionView)
	if connections == nil {
		return views
	}

	ids := make([]uint, 0, len(*connections))
	for _, c := range *connections {
		ids = append(ids, c.ID)

		access := model.ConnectionShareViewer
		if c.OwnerID == ownerID {
			access = "owner"
		}

		views[c.ID] = connectionView{access: access}
	}

	if s.shareRepo != nil && ownerID != "desktop" {
		shares, err := s.shareRepo.ListByUser(ctx, ownerID)
		if err == nil {
			for _, share := range shares {
				view := views[share.ConnectionID]
				if view.access != "owner" {
					view.access = share.Role
					views[share.ConnectionID] = view
				}
			}
		}
	}

	if s.secrets != nil {
		sharedIDs, err := s.secrets.SharedPasswordConnectionIDs(ctx, ids)
		if err == nil {
			for id, view := range views {
				if _, ok := sharedIDs[id]; ok {
					view.passwordShared = true
					views[id] = view
				}
			}
		}
	}

	return views
}

func (s IConnectionServiceImpl) toConnectionResponse(ctx context.Context, connection *model.Connection) dto.Connection {
	ownerID := helper.CtxOwnerID(ctx)
	views := s.viewsFor(ctx, ownerID, &[]model.Connection{*connection})

	return connectionToResponse(ctx, ownerID, s.cm, s.unlockStore, connection, views[connection.ID])
}
