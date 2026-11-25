package serviceTree

import (
	"context"
	"errors"
	"slices"

	"github.com/dbo-studio/dbo/internal/database"
	"github.com/dbo-studio/dbo/internal/model"
	serviceSafemode "github.com/dbo-studio/dbo/internal/service/safemode"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/permission"
	"github.com/dbo-studio/dbo/pkg/sqlguard"
)

func (i *ITreeServiceImpl) serverConnection(ctx context.Context, id int32) (*model.Connection, error) {
	if err := helper.RequirePermission(ctx, permission.DataCli); err != nil {
		return nil, err
	}

	conn, err := i.connectionRepo.Find(ctx, id)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	return conn, nil
}

func (i *ITreeServiceImpl) ServerCapabilities(ctx context.Context, id int32) (database.ServerCapabilities, error) {
	conn, err := i.serverConnection(ctx, id)
	if err != nil {
		return database.ServerCapabilities{}, err
	}

	return database.GetServerCapabilities(conn.ConnectionType), nil
}

func (i *ITreeServiceImpl) ServerPanel(ctx context.Context, id int32, panel string) (*database.ServerPanel, error) {
	conn, err := i.serverConnection(ctx, id)
	if err != nil {
		return nil, err
	}

	if !slices.Contains(database.GetServerCapabilities(conn.ConnectionType).Panels, panel) {
		return nil, apperror.BadRequest(errors.New("server panel is unavailable"))
	}

	out, err := database.ReadServerPanel(ctx, conn, i.cm, panel)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	return out, nil
}

func (i *ITreeServiceImpl) EndServerActivity(ctx context.Context, id int32, idTarget, token string, confirmed bool) error {
	conn, err := i.serverConnection(ctx, id)
	if err != nil {
		return err
	}

	if database.GetServerCapabilities(conn.ConnectionType).ActivityAction == "" {
		return apperror.BadRequest(errors.New("activity management is unavailable"))
	}

	policy := i.unlockStore.WithUnlock(ctx, helper.CtxOwnerID(ctx), conn.ID, serviceSafemode.FromConnection(conn))

	if !confirmed {
		return apperror.SafeModeConfirmRequired(map[string]any{"requiresConfirm": true, "reason": "Ending activity requires confirmation"})
	}

	if err = serviceSafemode.Enforce(policy, sqlguard.ClassCatastrophicDDL, confirmed); err != nil {
		return err
	}

	i.unlockStore.ConsumeGate(ctx, helper.CtxOwnerID(ctx), conn.ID, policy.Unlocked)

	if err = database.EndServerActivity(ctx, conn, i.cm, idTarget, token); err != nil {
		return apperror.DriverError(err)
	}

	return nil
}
