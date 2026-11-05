package databaseRedis

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/redis/go-redis/v9"
)

var _ contract.Windower = (*Repository)(nil)

// Window pages the members of a collection key. hash/set/zset use the SCAN cursor, list uses an offset.
// SCAN may return fewer (or more) than limit per call, so the loop keeps going until limit is reached or the scan ends.
func (r *Repository) Window(ctx context.Context, containerID, itemID, cursor string, limit int) (*contract.MemberWindow, error) {
	db, err := dbIndex(containerID)
	if err != nil {
		return nil, err
	}

	if limit <= 0 || limit > contract.MaxBrowseLimit {
		limit = 100
	}

	c := r.client(db)
	defer r.release(c)

	t, err := c.Type(ctx, itemID).Result()
	if err != nil {
		return nil, err
	}

	cur, err := strconv.ParseUint(orZero(cursor), 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid cursor: %w", err)
	}

	out := &contract.MemberWindow{Members: []contract.Member{}}

	switch t {
	case "hash":
		out.Total, _ = c.HLen(ctx, itemID).Result()
		next, err := scanPairs(cur, limit, func(cur uint64) ([]string, uint64, error) {
			return c.HScan(ctx, itemID, cur, "*", int64(limit)).Result()
		}, func(k, v string) { out.Members = append(out.Members, contract.Member{Key: k, Value: v}) })
		out.NextCursor = nextCursor(next)

		return out, err
	case "zset":
		out.Total, _ = c.ZCard(ctx, itemID).Result()
		next, err := scanPairs(cur, limit, func(cur uint64) ([]string, uint64, error) {
			return c.ZScan(ctx, itemID, cur, "*", int64(limit)).Result()
		}, func(k, v string) {
			score, _ := strconv.ParseFloat(v, 64)
			out.Members = append(out.Members, contract.Member{Key: k, Score: &score})
		})
		out.NextCursor = nextCursor(next)

		return out, err
	case "set":
		out.Total, _ = c.SCard(ctx, itemID).Result()

		for round := 0; round < maxScanRounds && len(out.Members) < limit; round++ {
			keys, next, err := c.SScan(ctx, itemID, cur, "*", int64(limit)).Result()
			if err != nil {
				return nil, err
			}

			for _, k := range keys {
				out.Members = append(out.Members, contract.Member{Key: k})
			}

			if cur = next; cur == 0 {
				break
			}
		}

		out.NextCursor = nextCursor(cur)

		return out, nil
	case "list":
		n, _ := c.LLen(ctx, itemID).Result()
		out.Total = n
		start := int64(cur)

		vals, err := c.LRange(ctx, itemID, start, start+int64(limit)-1).Result()
		if err != nil {
			return nil, err
		}

		for i, v := range vals {
			out.Members = append(out.Members, contract.Member{Key: strconv.FormatInt(start+int64(i), 10), Value: v})
		}

		if end := start + int64(len(vals)); end < n {
			out.NextCursor = strconv.FormatInt(end, 10)
		}

		return out, nil
	default:
		return nil, fmt.Errorf("type %q has no member window", t)
	}
}

func orZero(s string) string {
	if s == "" {
		return "0"
	}

	return s
}

func nextCursor(c uint64) string {
	if c == 0 {
		return ""
	}

	return strconv.FormatUint(c, 10)
}

// scanPairs drives a HSCAN/ZSCAN style scan (flat key,value pairs) until limit pairs are read or the scan ends.
// It returns the cursor to resume from; 0 means finished.
func scanPairs(cur uint64, limit int, scan func(uint64) ([]string, uint64, error), add func(k, v string)) (uint64, error) {
	n := 0

	for round := 0; round < maxScanRounds && n < limit; round++ {
		flat, next, err := scan(cur)
		if err != nil {
			return cur, err
		}

		for i := 0; i+1 < len(flat); i += 2 {
			add(flat[i], flat[i+1])
			n++
		}

		if cur = next; cur == 0 {
			break
		}
	}

	return cur, nil
}

// ApplyMember changes one member in place, so a key with millions of members is editable without a rewrite.
func (r *Repository) ApplyMember(ctx context.Context, containerID, itemID string, op contract.MemberOp) error {
	db, err := dbIndex(containerID)
	if err != nil {
		return err
	}

	c := r.client(db)
	defer r.release(c)

	t, err := c.Type(ctx, itemID).Result()
	if err != nil {
		return err
	}

	switch {
	case t == "hash" && op.Op == "set":
		return c.HSet(ctx, itemID, op.Key, op.Value).Err()
	case t == "hash" && op.Op == "remove":
		return c.HDel(ctx, itemID, op.Key).Err()
	case t == "set" && op.Op == "set":
		return c.SAdd(ctx, itemID, op.Key).Err()
	case t == "set" && op.Op == "remove":
		return c.SRem(ctx, itemID, op.Key).Err()
	case t == "zset" && op.Op == "set":
		if op.Score == nil {
			return errors.New("score is required")
		}

		return c.ZAdd(ctx, itemID, redis.Z{Member: op.Key, Score: *op.Score}).Err()
	case t == "zset" && op.Op == "remove":
		return c.ZRem(ctx, itemID, op.Key).Err()
	case t == "list" && op.Op == "append":
		return c.RPush(ctx, itemID, op.Value).Err()
	case t == "list" && op.Op == "set":
		idx, err := strconv.ParseInt(op.Key, 10, 64)
		if err != nil {
			return fmt.Errorf("invalid list index: %w", err)
		}

		return c.LSet(ctx, itemID, idx, op.Value).Err()
	case t == "list" && op.Op == "remove":
		// LREM removes by value; the first match from the head is the closest we can get to "this row".
		return c.LRem(ctx, itemID, 1, op.Value).Err()
	default:
		return fmt.Errorf("operation %q is not valid for type %q", op.Op, t)
	}
}
