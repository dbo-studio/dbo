package databaseRedis

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

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

	pos, err := parseScanPos(cursor)
	if err != nil {
		return nil, err
	}

	out := &contract.MemberWindow{Members: []contract.Member{}}

	switch t {
	case "hash":
		out.Total, _ = c.HLen(ctx, itemID).Result()
		next, err := scanItems(pos, limit, 2, func(cur uint64) ([]string, uint64, error) {
			return c.HScan(ctx, itemID, cur, "*", int64(limit)).Result()
		}, func(kv []string) { out.Members = append(out.Members, contract.Member{Key: kv[0], Value: kv[1]}) })
		out.NextCursor = next.String()

		return out, err
	case "zset":
		out.Total, _ = c.ZCard(ctx, itemID).Result()
		next, err := scanItems(pos, limit, 2, func(cur uint64) ([]string, uint64, error) {
			return c.ZScan(ctx, itemID, cur, "*", int64(limit)).Result()
		}, func(kv []string) {
			score, _ := strconv.ParseFloat(kv[1], 64)
			out.Members = append(out.Members, contract.Member{Key: kv[0], Score: &score})
		})
		out.NextCursor = next.String()

		return out, err
	case "set":
		out.Total, _ = c.SCard(ctx, itemID).Result()
		next, err := scanItems(pos, limit, 1, func(cur uint64) ([]string, uint64, error) {
			return c.SScan(ctx, itemID, cur, "*", int64(limit)).Result()
		}, func(k []string) { out.Members = append(out.Members, contract.Member{Key: k[0]}) })
		out.NextCursor = next.String()

		return out, err
	case "list":
		n, _ := c.LLen(ctx, itemID).Result()
		out.Total = n
		start := int64(pos.cur)

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

// scanPos is where a SCAN-style walk resumes: the server cursor plus how many entries of that batch were already
// handed out. Small collections (listpack/intset) come back whole in one batch whatever COUNT says, so a page
// boundary can fall inside a batch; the cursor then reads "<cursor>.<skip>" and the next call re-scans and skips.
type scanPos struct {
	cur  uint64
	skip int
}

func parseScanPos(s string) (scanPos, error) {
	curPart, skipPart, _ := strings.Cut(s, ".")
	if curPart == "" {
		curPart = "0"
	}

	cur, err := strconv.ParseUint(curPart, 10, 64)
	if err != nil {
		return scanPos{}, fmt.Errorf("invalid cursor: %w", err)
	}

	skip := 0
	if skipPart != "" {
		if skip, err = strconv.Atoi(skipPart); err != nil || skip < 0 {
			return scanPos{}, errors.New("invalid cursor")
		}
	}

	return scanPos{cur: cur, skip: skip}, nil
}

// String is empty when the walk is finished.
func (p scanPos) String() string {
	switch {
	case p.cur == 0 && p.skip == 0:
		return ""
	case p.skip == 0:
		return strconv.FormatUint(p.cur, 10)
	default:
		return strconv.FormatUint(p.cur, 10) + "." + strconv.Itoa(p.skip)
	}
}

// scanItems walks a SCAN-style command (entries are `width` strings: 1 for sets, 2 for key/value pairs) and hands
// out at most limit entries. It returns where the next page starts.
func scanItems(pos scanPos, limit, width int, scan func(uint64) ([]string, uint64, error), add func(entry []string)) (scanPos, error) {
	n := 0

	for round := 0; round < maxScanRounds && n < limit; round++ {
		flat, next, err := scan(pos.cur)
		if err != nil {
			return pos, err
		}

		units := len(flat) / width
		for i := pos.skip; i < units; i++ {
			if n == limit {
				return scanPos{cur: pos.cur, skip: i}, nil
			}

			add(flat[i*width : (i+1)*width])

			n++
		}

		pos = scanPos{cur: next}
		if next == 0 {
			break
		}
	}

	return pos, nil
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
		return removeListIndex(ctx, c, itemID, op)
	default:
		return fmt.Errorf("operation %q is not valid for type %q", op.Op, t)
	}
}

// removeListIndex removes the element at one index. Redis can only remove by value, so the element is first
// overwritten with a unique token and that token is removed, all inside a transaction that fails when the key
// changed since it was read. op.Value is the value the caller saw at op.Key; a mismatch means a stale view.
func removeListIndex(ctx context.Context, c *redis.Client, key string, op contract.MemberOp) error {
	idx, err := strconv.ParseInt(op.Key, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid list index: %w", err)
	}

	token := "\x00dbo-remove:" + strconv.FormatInt(time.Now().UnixNano(), 36)

	return c.Watch(ctx, func(tx *redis.Tx) error {
		cur, err := tx.LIndex(ctx, key, idx).Result()
		if errors.Is(err, redis.Nil) {
			return fmt.Errorf("list index %d no longer exists; refresh", idx)
		}

		if err != nil {
			return err
		}

		if cur != op.Value {
			return fmt.Errorf("list index %d changed since it was loaded; refresh", idx)
		}

		_, err = tx.TxPipelined(ctx, func(p redis.Pipeliner) error {
			p.LSet(ctx, key, idx, token)
			p.LRem(ctx, key, 1, token)

			return nil
		})

		return err
	}, key)
}
