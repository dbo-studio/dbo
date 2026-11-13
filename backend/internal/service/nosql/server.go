package serviceNoSQL

import (
	"context"
	"fmt"
	"io"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
)

// ErrTooManyStreams is returned when a user already holds the most streaming tools.
var ErrTooManyStreams = fmt.Errorf("at most %d concurrent streams", MaxSubscriptionsPerUser)

// How serious a server-level call is, for Safe Mode: a read needs nothing, a write follows the connection's policy and a
// destructive call always needs confirmation.
const (
	ServerRead        = "server-read"
	ServerWrite       = "server-write"
	ServerDestructive = "server-destructive"
)

func (s *Service) serverTools(ctx context.Context, connectionID int32) (contract.NoSQLRepository, contract.ServerTools, error) {
	// The server views reach beyond one collection (every database, running operations, users), so they need the same
	// permission as the command line.
	if err := helper.RequirePermission(ctx, helper.PermCli); err != nil {
		return nil, nil, err
	}

	repo, _, err := s.open(ctx, connectionID)
	if err != nil {
		return nil, nil, err
	}

	t, ok := repo.(contract.ServerTools)
	if !ok {
		return nil, nil, apperror.BadRequest(ErrToolNotSupported)
	}

	return repo, t, nil
}

// ServerCall runs one server-level call. kind is ServerRead, ServerWrite or ServerDestructive.
func (s *Service) ServerCall(ctx context.Context, connectionID int32, kind string, confirmed bool, fn func(contract.ServerTools) (any, error)) (any, error) {
	repo, t, err := s.serverTools(ctx, connectionID)
	if err != nil {
		return nil, err
	}

	if kind != ServerRead {
		if err := s.guard(ctx, repo, connectionID, contract.Operation{Name: kind, Count: 1}, confirmed); err != nil {
			return nil, err
		}
	}

	out, err := fn(t)
	if err != nil {
		return nil, driverErr(err)
	}

	return out, nil
}

// GridFSOpen starts a file download; the caller closes the reader.
func (s *Service) GridFSOpen(ctx context.Context, connectionID int32, db, bucket, id string) (io.ReadCloser, *contract.GridFSFile, error) {
	_, t, err := s.serverTools(ctx, connectionID)
	if err != nil {
		return nil, nil, err
	}

	r, f, err := t.GridFSOpen(ctx, db, bucket, id)
	if err != nil {
		return nil, nil, driverErr(err)
	}

	return r, f, nil
}

// WatchChanges blocks until ctx is done, calling emit for each change on the collection.
func (s *Service) WatchChanges(ctx context.Context, connectionID int32, containerID string, emit func(contract.ChangeEvent) error) error {
	_, t, err := s.serverTools(ctx, connectionID)
	if err != nil {
		return err
	}

	owner := helper.CtxOwnerID(ctx)
	if !s.acquire(owner) {
		return apperror.BadRequest(ErrTooManyStreams)
	}
	defer s.release(owner)

	if err := t.WatchChanges(ctx, containerID, emit); err != nil {
		return driverErr(err)
	}

	return nil
}
