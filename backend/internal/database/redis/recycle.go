package databaseRedis

import (
	"context"
	"errors"
	"time"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/redis/go-redis/v9"
)

var _ contract.Recycler = (*Repository)(nil)

// Snapshot captures a key with DUMP so RESTORE can bring it back with its TTL.
func (r *Repository) Snapshot(ctx context.Context, containerID, itemID string) ([]byte, int64, bool, error) {
	db, err := dbIndex(containerID)
	if err != nil {
		return nil, 0, false, err
	}

	c := r.client(db)
	defer r.release(c)

	payload, err := c.Dump(ctx, itemID).Result()
	if errors.Is(err, redis.Nil) {
		return nil, 0, false, nil
	}

	if err != nil {
		return nil, 0, false, err
	}

	ttl, err := c.PTTL(ctx, itemID).Result()
	if err != nil {
		return nil, 0, false, err
	}

	// go-redis returns -1/-2 as raw nanoseconds, so test the sign before converting.
	if ttl < 0 {
		return []byte(payload), 0, true, nil
	}

	return []byte(payload), ttl.Milliseconds() + 1, true, nil
}

// Restore uses plain RESTORE (no REPLACE): an existing key is never overwritten.
func (r *Repository) Restore(ctx context.Context, containerID, itemID string, payload []byte, ttlMs int64) error {
	db, err := dbIndex(containerID)
	if err != nil {
		return err
	}

	c := r.client(db)
	defer r.release(c)

	return c.Restore(ctx, itemID, time.Duration(ttlMs)*time.Millisecond, string(payload)).Err()
}
