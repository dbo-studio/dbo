package serviceQuery

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseMssql "github.com/dbo-studio/dbo/internal/database/mssql"
	serviceDbtools "github.com/dbo-studio/dbo/internal/service/dbtools"
	serviceSafemode "github.com/dbo-studio/dbo/internal/service/safemode"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/sqlguard"
)

func (i IQueryServiceImpl) Explain(ctx context.Context, req *dto.RawQueryRequest) (*dto.RawQueryResponse, error) {
	conn, err := i.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	var statement string
	if conn.ConnectionType == databaseContract.SQLServer {
		statement, err = serviceDbtools.GuardExplainSQL(req.Query)
	} else {
		statement, err = serviceDbtools.ExplainStatement(conn.ConnectionType, req.Query)
	}

	if err != nil {
		return nil, apperror.BadRequest(err)
	}

	policy := i.unlockStore.WithUnlock(ctx, helper.CtxOwnerID(ctx), conn.ID, serviceSafemode.FromConnection(conn))
	if err := serviceSafemode.Enforce(policy, sqlguard.ClassRead, req.Confirmed); err != nil {
		return nil, err
	}

	i.unlockStore.ConsumeGate(ctx, helper.CtxOwnerID(ctx), conn.ID, policy.Unlocked)

	if conn.ConnectionType == databaseContract.SQLServer {
		db, err := i.cm.GetConnection(ctx, conn, true)
		if err != nil {
			return nil, apperror.DriverError(err)
		}

		plan, err := databaseMssql.ShowPlan(ctx, db, statement)
		if err != nil {
			return nil, apperror.DriverError(err)
		}

		return &dto.RawQueryResponse{
			Query:   statement,
			Columns: []databaseContract.Column{{Name: "Query plan", Type: "xml", MappedType: "string", IsActive: true}},
			Data:    []map[string]any{{"Query plan": plan}},
		}, nil
	}

	repo, err := database.NewDatabaseRepository(ctx, conn, i.cm)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	return repo.RunRawQuery(ctx, &dto.RawQueryRequest{
		ConnectionID: req.ConnectionID,
		Query:        statement,
		Database:     req.Database,
		Schema:       req.Schema,
	})
}
