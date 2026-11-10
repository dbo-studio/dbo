package serviceNoSQL

import (
	"context"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
)

const (
	// recycleMaxItems: larger deletes (folder, flush, bulk) are not undoable.
	recycleMaxItems = 100
	recycleMaxEntry = 1 << 20  // 1 MiB per item
	recycleMaxTotal = 32 << 20 // 32 MiB per owner
	recycleMaxCount = 500      // entries per owner
	recycleTTL      = 7 * 24 * time.Hour
)

// stash snapshots the items before a delete. Items over the size cap are skipped; they cannot be undone.
func (s *Service) stash(ctx context.Context, repo contract.NoSQLRepository, connectionID int32, containerID string, ids []string) {
	rec, ok := repo.(contract.Recycler)
	if !ok || len(ids) == 0 || len(ids) > recycleMaxItems {
		return
	}

	owner := helper.CtxOwnerID(ctx)
	now := time.Now()

	for _, id := range ids {
		payload, ttl, found, err := rec.Snapshot(ctx, containerID, id)
		if err != nil || !found || len(payload) > recycleMaxEntry {
			continue
		}

		_ = s.recycleRepo.Create(ctx, &model.NoSQLRecycleEntry{
			OwnerID: owner, ConnectionID: connectionID, ContainerID: containerID, ItemID: id,
			Payload: payload, TTLMs: ttl, Size: len(payload), CreatedAt: now, ExpiresAt: now.Add(recycleTTL),
		})
	}

	_ = s.recycleRepo.Prune(ctx, owner, recycleMaxCount, recycleMaxTotal)
}

func (s *Service) RecycleList(ctx context.Context, connectionID int32) ([]dto.NoSQLRecycleItem, error) {
	owner := helper.CtxOwnerID(ctx)

	_ = s.recycleRepo.Prune(ctx, owner, recycleMaxCount, recycleMaxTotal)

	rows, err := s.recycleRepo.List(ctx, owner, connectionID)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	out := make([]dto.NoSQLRecycleItem, 0, len(rows))
	for _, r := range rows {
		out = append(out, dto.NoSQLRecycleItem{ID: r.ID, ContainerID: r.ContainerID, ItemID: r.ItemID, Size: r.Size, DeletedAt: r.CreatedAt})
	}

	return out, nil
}

func (s *Service) RecycleRestore(ctx context.Context, req *dto.NoSQLRecycleRestoreRequest) error {
	owner := helper.CtxOwnerID(ctx)

	entry, err := s.recycleRepo.Find(ctx, owner, req.ID)
	if err != nil || entry.ConnectionID != req.ConnectionID {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, _, err := s.open(ctx, entry.ConnectionID)
	if err != nil {
		return err
	}

	rec, ok := repo.(contract.Recycler)
	if !ok {
		return apperror.BadRequest(ErrToolNotSupported)
	}

	if err := s.require(ctx, repo, entry.ContainerID, contract.CapRecycle, contract.CapInsert); err != nil {
		return err
	}

	if err := s.guard(ctx, repo, entry.ConnectionID, contract.Operation{Name: "insert", ContainerID: entry.ContainerID, Count: 1}, req.Confirmed); err != nil {
		return err
	}

	if err := rec.Restore(ctx, entry.ContainerID, entry.ItemID, entry.Payload, entry.TTLMs); err != nil {
		return apperror.BadRequest(err)
	}

	return s.recycleRepo.Delete(ctx, owner, entry.ID)
}
