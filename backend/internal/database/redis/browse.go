package databaseRedis

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"time"
	"unicode/utf8"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/redis/go-redis/v9"
)

const (
	// maxScanRounds bounds one Browse call: SCAN may return empty pages on sparse matches.
	maxScanRounds = 200
	// maxMembers bounds how many members/fields/entries one Get loads.
	maxMembers = 1000
)

// Browse pages keys with SCAN (never KEYS). The cursor is the redis cursor; an empty NextCursor means the scan finished.
func (r *Repository) Browse(ctx context.Context, containerID string, q contract.BrowseQuery) (*contract.BrowsePage, error) {
	db, err := dbIndex(containerID)
	if err != nil {
		return nil, err
	}

	c := r.client(db)
	defer r.release(c)

	limit := q.ClampLimit(100)

	match := q.Filter
	if match == "" {
		match = "*"
	}

	cursor := uint64(0)
	if q.Cursor != "" {
		if cursor, err = strconv.ParseUint(q.Cursor, 10, 64); err != nil {
			return nil, fmt.Errorf("invalid cursor: %w", err)
		}
	}

	var keys []string

	for round := 0; round < maxScanRounds && len(keys) < limit; round++ {
		batch, next, err := c.Scan(ctx, cursor, match, int64(limit)).Result()
		if err != nil {
			return nil, err
		}

		keys = append(keys, batch...)
		cursor = next

		if cursor == 0 {
			break
		}
	}

	page := &contract.BrowsePage{Items: make([]contract.Item, 0, len(keys))}
	if cursor != 0 {
		page.NextCursor = strconv.FormatUint(cursor, 10)
	}

	// Type + TTL for the whole page in one round trip.
	pipe := c.Pipeline()
	types := make([]*redis.StatusCmd, len(keys))
	ttls := make([]*redis.DurationCmd, len(keys))

	for i, k := range keys {
		types[i] = pipe.Type(ctx, k)
		ttls[i] = pipe.PTTL(ctx, k)
	}

	if _, err := pipe.Exec(ctx); err != nil && !errors.Is(err, redis.Nil) {
		return nil, err
	}

	for i, k := range keys {
		t := types[i].Val()
		page.Items = append(page.Items, contract.Item{
			ID:   k,
			View: viewFor(t),
			Meta: map[string]any{"type": t, "ttl": ttlSeconds(ttls[i].Val())},
		})
	}

	return page, nil
}

func viewFor(t string) contract.ViewKind {
	switch t {
	case "hash":
		return contract.ViewFields
	case "list", "stream":
		return contract.ViewList
	case "set", "zset":
		return contract.ViewSet
	case "ReJSON-RL":
		return contract.ViewDocument
	default:
		return contract.ViewText
	}
}

// ttlSeconds maps PTTL: -1 no expiry, -2 missing. Sub-second TTLs round up so they never read as 0.
func ttlSeconds(d time.Duration) int64 {
	// go-redis maps PTTL -1/-2 to Duration(-1/-2) nanoseconds, so test the sign before converting.
	if d < 0 {
		return -1
	}

	return (d.Milliseconds() + 999) / 1000
}

// Get loads one key fully (bounded) with its meta: type, ttl, encoding, memory, length.
func (r *Repository) Get(ctx context.Context, containerID, itemID string) (*contract.Item, error) {
	db, err := dbIndex(containerID)
	if err != nil {
		return nil, err
	}

	c := r.client(db)
	defer r.release(c)

	t, err := c.Type(ctx, itemID).Result()
	if err != nil {
		return nil, err
	}

	if t == "none" {
		return nil, contract.Invalid("key %q does not exist", itemID)
	}

	item := &contract.Item{ID: itemID, View: viewFor(t), Meta: map[string]any{"type": t}}

	if ttl, err := c.PTTL(ctx, itemID).Result(); err == nil {
		item.Meta["ttl"] = ttlSeconds(ttl)
	}

	// Optional diagnostics: ignore errors, since ACLs commonly deny them.
	if enc, err := c.ObjectEncoding(ctx, itemID).Result(); err == nil {
		item.Meta["encoding_redis"] = enc
	}

	if mem, err := c.MemoryUsage(ctx, itemID).Result(); err == nil {
		item.Meta["memory"] = mem
	}

	if err := r.load(ctx, c, t, itemID, item); err != nil {
		return nil, err
	}

	return item, nil
}

func (r *Repository) load(ctx context.Context, c *redis.Client, t, key string, item *contract.Item) error {
	switch t {
	case "string":
		s, err := c.Get(ctx, key).Result()
		if err != nil {
			return err
		}

		// Binary-safe: invalid UTF-8 travels as base64 with a flag.
		if utf8.ValidString(s) {
			item.Value = s
		} else {
			item.Value = base64.StdEncoding.EncodeToString([]byte(s))
			item.Meta["encoding"] = "base64"
		}
	case "hash":
		m := map[string]string{}
		it := c.HScan(ctx, key, 0, "*", 100).Iterator()

		for it.Next(ctx) {
			field := it.Val()
			if !it.Next(ctx) {
				break
			}

			m[field] = it.Val()
			if len(m) >= maxMembers {
				markTruncated(item)
				break
			}
		}

		if err := it.Err(); err != nil {
			return err
		}

		item.Value = m
	case "list":
		n, _ := c.LLen(ctx, key).Result()

		vals, err := c.LRange(ctx, key, 0, maxMembers-1).Result()
		if err != nil {
			return err
		}

		item.Value, item.Meta["length"] = vals, n
		if n > maxMembers {
			markTruncated(item)
		}
	case "set":
		n, _ := c.SCard(ctx, key).Result()
		vals := make([]string, 0)
		it := c.SScan(ctx, key, 0, "*", 100).Iterator()

		for it.Next(ctx) {
			vals = append(vals, it.Val())
			if len(vals) >= maxMembers {
				markTruncated(item)
				break
			}
		}

		if err := it.Err(); err != nil {
			return err
		}

		item.Value, item.Meta["length"] = vals, n
	case "zset":
		n, _ := c.ZCard(ctx, key).Result()

		zs, err := c.ZRangeWithScores(ctx, key, 0, maxMembers-1).Result()
		if err != nil {
			return err
		}

		out := make([]map[string]any, 0, len(zs))
		for _, z := range zs {
			out = append(out, map[string]any{"member": fmt.Sprint(z.Member), "score": z.Score})
		}

		item.Value, item.Meta["length"], item.Meta["scored"] = out, n, true
		if n > maxMembers {
			markTruncated(item)
		}
	case "stream":
		n, _ := c.XLen(ctx, key).Result()

		entries, err := c.XRangeN(ctx, key, "-", "+", 100).Result()
		if err != nil {
			return err
		}

		out := make([]string, 0, len(entries))
		for _, e := range entries {
			out = append(out, e.ID+" "+fmt.Sprint(e.Values))
		}

		item.Value, item.Meta["length"], item.Meta["readonly"] = out, n, true
	case "ReJSON-RL":
		v, err := c.Do(ctx, "JSON.GET", key).Text()
		if err != nil {
			return err
		}

		item.Value, item.Meta["readonly"] = v, true
	default:
		item.Value, item.Meta["readonly"] = "", true
	}

	return nil
}

// markTruncated flags a partial view. Whole-key saves are refused for it (see replaceValue); the UI pages
// and edits members through Window/ApplyMember instead.
func markTruncated(item *contract.Item) {
	item.Meta["truncated"] = true
}
