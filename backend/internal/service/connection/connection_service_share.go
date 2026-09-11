package serviceConnection

import (
	"context"
	"fmt"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

func (s IConnectionServiceImpl) ListShares(ctx context.Context, connectionID int32) (*dto.ConnectionSharesResponse, error) {
	connection, err := s.loadForShareManage(ctx, connectionID)
	if err != nil {
		return nil, err
	}

	return s.sharesResponse(ctx, connection)
}

func (s IConnectionServiceImpl) CreateShare(ctx context.Context, connectionID int32, req *dto.CreateConnectionShareRequest) (*dto.ConnectionSharesResponse, error) {
	if !sharingAvailable(ctx) {
		return nil, apperror.BadRequest(apperror.ErrSharingUnavailable)
	}

	connection, err := s.loadForShareManage(ctx, connectionID)
	if err != nil {
		return nil, err
	}

	targetID := req.UserID
	if targetID == connection.OwnerID {
		return nil, apperror.BadRequest(apperror.ErrCannotShareWithOwner)
	}

	user, err := s.userRepo.FindByID(ctx, targetID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrUserNotFound)
	}

	if user.IsDisabled() {
		return nil, apperror.BadRequest(apperror.ErrUserDisabled)
	}

	if err := s.shareRepo.Upsert(ctx, &model.ConnectionShare{
		ConnectionID: connection.ID,
		UserID:       targetID,
		Role:         req.Role,
		CreatedAt:    time.Now().UTC(),
	}); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	if lo.FromPtr(req.PasswordShared) {
		if err := s.enablePasswordShare(ctx, connection); err != nil {
			return nil, err
		}
	}

	s.audit(fmt.Sprintf("connection_share grant connection=%d user=%s role=%s passwordShared=%v actor=%s",
		connection.ID, targetID, req.Role, lo.FromPtr(req.PasswordShared), helper.CtxUserID(ctx)))

	return s.sharesResponse(ctx, connection)
}

func (s IConnectionServiceImpl) UpdateShare(ctx context.Context, connectionID int32, userID string, req *dto.UpdateConnectionShareRequest) (*dto.ConnectionSharesResponse, error) {
	connection, err := s.loadForShareManage(ctx, connectionID)
	if err != nil {
		return nil, err
	}

	if _, err := s.shareRepo.Find(ctx, connection.ID, userID); err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionShareNotFound)
	}

	if err := s.shareRepo.Upsert(ctx, &model.ConnectionShare{
		ConnectionID: connection.ID,
		UserID:       userID,
		Role:         req.Role,
	}); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	s.audit(fmt.Sprintf("connection_share update connection=%d user=%s role=%s actor=%s",
		connection.ID, userID, req.Role, helper.CtxUserID(ctx)))

	return s.sharesResponse(ctx, connection)
}

func (s IConnectionServiceImpl) DeleteShare(ctx context.Context, connectionID int32, userID string) (*dto.ConnectionSharesResponse, error) {
	connection, err := s.loadForShareManage(ctx, connectionID)
	if err != nil {
		return nil, err
	}

	if err := s.revokeShare(ctx, connection, userID); err != nil {
		return nil, err
	}

	s.audit(fmt.Sprintf("connection_share revoke connection=%d user=%s actor=%s",
		connection.ID, userID, helper.CtxUserID(ctx)))

	return s.sharesResponse(ctx, connection)
}

func (s IConnectionServiceImpl) LeaveShare(ctx context.Context, connectionID int32) error {
	connection, err := s.connectionRepo.Find(ctx, connectionID)
	if err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	ownerID := helper.CtxOwnerID(ctx)
	if connection.OwnerID == ownerID {
		return apperror.BadRequest(apperror.ErrCannotShareWithOwner)
	}

	return s.revokeShare(ctx, connection, ownerID)
}

func (s IConnectionServiceImpl) UpdatePasswordShare(ctx context.Context, connectionID int32, req *dto.UpdatePasswordShareRequest) (*dto.ConnectionSharesResponse, error) {
	connection, err := s.loadForShareManage(ctx, connectionID)
	if err != nil {
		return nil, err
	}

	if req.Enabled {
		if err := s.enablePasswordShare(ctx, connection); err != nil {
			return nil, err
		}
	} else {
		if err := s.secrets.DeleteSharedConnectionPassword(ctx, connection.ID); err != nil {
			return nil, apperror.InternalServerError(err)
		}

		if err := s.closeMemberPools(ctx, connection); err != nil {
			return nil, err
		}
	}

	s.audit(fmt.Sprintf("connection_share password_shared=%v connection=%d actor=%s",
		req.Enabled, connection.ID, helper.CtxUserID(ctx)))

	return s.sharesResponse(ctx, connection)
}

func (s IConnectionServiceImpl) AdminListShares(ctx context.Context) ([]dto.AdminConnectionShare, error) {
	if helper.CtxUserRole(ctx) != string(model.UserRoleAdmin) {
		return nil, apperror.Forbidden(apperror.ErrAdminRequired)
	}

	shares, err := s.shareRepo.ListAll(ctx)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	byConn := map[uint][]model.ConnectionShare{}
	for _, share := range shares {
		byConn[share.ConnectionID] = append(byConn[share.ConnectionID], share)
	}

	emails := s.userEmailMap(ctx)
	out := make([]dto.AdminConnectionShare, 0, len(byConn))

	for connectionID, members := range byConn {
		connection, err := s.connectionRepo.FindByID(ctx, int32(connectionID))
		if err != nil {
			continue
		}

		passwordShared, err := s.secrets.HasSharedConnectionPassword(ctx, connection.ID)
		if err != nil {
			return nil, apperror.InternalServerError(err)
		}

		out = append(out, dto.AdminConnectionShare{
			ConnectionID:   int64(connection.ID),
			ConnectionName: connection.Name,
			OwnerID:        connection.OwnerID,
			OwnerEmail:     emails[connection.OwnerID],
			PasswordShared: passwordShared,
			Members:        toShareMembers(members, emails),
		})
	}

	return out, nil
}

func (s IConnectionServiceImpl) loadForShareManage(ctx context.Context, connectionID int32) (*model.Connection, error) {
	connection, err := s.connectionRepo.FindByID(ctx, connectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	access := s.resolveAccess(ctx, connection)
	if access.canManageShares() {
		return connection, nil
	}

	if access.canUse() {
		return nil, apperror.Forbidden(apperror.ErrConnectionShareForbidden)
	}

	return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
}

func (s IConnectionServiceImpl) enablePasswordShare(ctx context.Context, connection *model.Connection) error {
	password, err := s.secrets.GetConnectionPassword(ctx, connection.OwnerID, connection.ID)
	if err != nil {
		return apperror.BadRequest(apperror.ErrSharedPasswordNotRemembered)
	}

	temporary, err := s.secrets.IsTemporaryConnectionPassword(ctx, connection.OwnerID, connection.ID)
	if err != nil {
		return apperror.InternalServerError(err)
	}

	if temporary {
		return apperror.BadRequest(apperror.ErrSharedPasswordNotRemembered)
	}

	if err := s.secrets.SetSharedConnectionPassword(ctx, connection.ID, password); err != nil {
		return apperror.InternalServerError(err)
	}

	return nil
}

func (s IConnectionServiceImpl) revokeShare(ctx context.Context, connection *model.Connection, userID string) error {
	if err := s.shareRepo.Delete(ctx, connection.ID, userID); err != nil {
		return apperror.InternalServerError(err)
	}

	if err := s.secrets.DeleteConnectionPassword(ctx, userID, connection.ID); err != nil {
		return apperror.InternalServerError(err)
	}

	if s.cm != nil {
		if err := s.cm.Close(ctx, userID, connection.ID); err != nil {
			return apperror.InternalServerError(err)
		}
	}

	return nil
}

func (s IConnectionServiceImpl) sharesResponse(ctx context.Context, connection *model.Connection) (*dto.ConnectionSharesResponse, error) {
	members, err := s.shareRepo.ListByConnection(ctx, connection.ID)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	passwordShared, err := s.secrets.HasSharedConnectionPassword(ctx, connection.ID)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return &dto.ConnectionSharesResponse{
		PasswordShared: passwordShared,
		Members:        toShareMembers(members, s.userEmailMap(ctx)),
	}, nil
}

func (s IConnectionServiceImpl) userEmailMap(ctx context.Context) map[string]string {
	out := map[string]string{}

	users, err := s.userRepo.List(ctx)
	if err != nil {
		return out
	}

	for i := range users {
		out[users[i].ID] = users[i].Email
	}

	return out
}

func toShareMembers(shares []model.ConnectionShare, emails map[string]string) []dto.ConnectionShareMember {
	members := make([]dto.ConnectionShareMember, 0, len(shares))
	for _, share := range shares {
		members = append(members, dto.ConnectionShareMember{
			UserID:    share.UserID,
			Email:     emails[share.UserID],
			Role:      share.Role,
			CreatedAt: share.CreatedAt.UTC().Format(time.RFC3339),
		})
	}

	return members
}

func (s IConnectionServiceImpl) closePoolsForConnection(ctx context.Context, connection *model.Connection) error {
	if s.cm == nil {
		return nil
	}

	ids := []string{connection.OwnerID}

	shares, err := s.shareRepo.ListByConnection(ctx, connection.ID)
	if err != nil {
		return err
	}

	for _, share := range shares {
		ids = append(ids, share.UserID)
	}

	for _, id := range ids {
		if err := s.cm.Close(ctx, id, connection.ID); err != nil {
			return err
		}
	}

	return nil
}

func (s IConnectionServiceImpl) closeMemberPools(ctx context.Context, connection *model.Connection) error {
	if s.cm == nil {
		return nil
	}

	shares, err := s.shareRepo.ListByConnection(ctx, connection.ID)
	if err != nil {
		return apperror.InternalServerError(err)
	}

	for _, share := range shares {
		if err := s.cm.Close(ctx, share.UserID, connection.ID); err != nil {
			return apperror.InternalServerError(err)
		}
	}

	return nil
}

func (s IConnectionServiceImpl) audit(msg string) {
	if s.logger != nil {
		s.logger.Info(msg)
	}
}
