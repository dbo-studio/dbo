package databaseRedis

import (
	"context"
	"fmt"
)

const bulkBatch = 500

// scanBatches walks SCAN MATCH pattern and hands each batch of keys to fn. It stops when fn returns false or ctx is done.
func scanBatches(ctx context.Context, r *Repository, db int, pattern string, fn func(keys []string) bool) error {
	c := r.client(db)
	defer r.release(c)

	if pattern == "" {
		pattern = "*"
	}

	var cursor uint64

	for {
		keys, next, err := c.Scan(ctx, cursor, pattern, bulkBatch).Result()
		if err != nil {
			return err
		}

		if len(keys) > 0 && !fn(keys) {
			return nil
		}

		if cursor = next; cursor == 0 {
			return ctx.Err()
		}

		if err := ctx.Err(); err != nil {
			return err
		}
	}
}

// CountMatching counts keys matching pattern with SCAN, stopping at limit.
func (r *Repository) CountMatching(ctx context.Context, containerID, pattern string, limit int) (int, bool, error) {
	db, err := dbIndex(containerID)
	if err != nil {
		return 0, false, err
	}

	var (
		n      int
		capped bool
	)

	err = scanBatches(ctx, r, db, pattern, func(keys []string) bool {
		n += len(keys)
		if n >= limit {
			n, capped = limit, true

			return false
		}

		return true
	})

	return n, capped, err
}

// DeleteMatching UNLINKs matches batch by batch. Keys created after the scan starts may be missed or caught: SCAN gives no snapshot.
func (r *Repository) DeleteMatching(ctx context.Context, containerID, pattern string, progress func(int)) (int, error) {
	db, err := dbIndex(containerID)
	if err != nil {
		return 0, err
	}

	c := r.client(db)
	defer r.release(c)

	var (
		total   int
		unlinkE error
	)

	err = scanBatches(ctx, r, db, pattern, func(keys []string) bool {
		n, err := c.Unlink(ctx, keys...).Result()
		if err != nil {
			unlinkE = fmt.Errorf("unlink: %w", err)

			return false
		}

		total += int(n)
		progress(total)

		return true
	})

	if unlinkE != nil {
		return total, unlinkE
	}

	return total, err
}
