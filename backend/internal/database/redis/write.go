package databaseRedis

import (
	"context"
	"encoding/base64"
	"fmt"
	"time"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/redis/go-redis/v9"
)

// maxDeleteBatch matches contract.MaxBrowseLimit: callers never delete an unbounded set in one call.
const maxDeleteBatch = contract.MaxBrowseLimit

func (r *Repository) Save(ctx context.Context, containerID, itemID string, change contract.ItemChange) error {
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

	if t == "none" {
		return contract.Invalid("key %q does not exist", itemID)
	}

	if change.Value != nil {
		if err := replaceValue(ctx, c, t, itemID, change.Value, change.Meta); err != nil {
			return err
		}
	}

	if change.TTLSecs != nil {
		if *change.TTLSecs > 0 {
			err = c.Expire(ctx, itemID, time.Duration(*change.TTLSecs)*time.Second).Err()
		} else {
			err = c.Persist(ctx, itemID).Err()
		}

		if err != nil {
			return err
		}
	}

	if change.NewID != "" && change.NewID != itemID {
		ok, err := c.RenameNX(ctx, itemID, change.NewID).Result()
		if err != nil {
			return err
		}

		if !ok {
			return contract.Invalid("key %q already exists", change.NewID)
		}
	}

	return nil
}

// replaceValue rewrites a key atomically (MULTI) and keeps its TTL.
func replaceValue(ctx context.Context, c *redis.Client, t, key string, value any, meta map[string]any) error {
	ttl, err := c.PTTL(ctx, key).Result()
	if err != nil {
		return err
	}

	if t == "string" {
		s, err := stringValue(value, meta)
		if err != nil {
			return err
		}

		return c.SetArgs(ctx, key, s, redis.SetArgs{KeepTTL: true}).Err()
	}

	// A rewrite of a key bigger than the browse limit would silently drop members: use member operations.
	if n, err := collectionLen(ctx, c, t, key); err != nil {
		return err
	} else if n > maxMembers {
		return contract.Invalid("%s has %d members; edit members one at a time", key, n)
	}

	_, err = c.TxPipelined(ctx, func(p redis.Pipeliner) error {
		p.Del(ctx, key)

		if err := fill(ctx, p, t, key, value); err != nil {
			return err
		}

		if ttl > 0 {
			p.PExpire(ctx, key, ttl)
		}

		return nil
	})

	return err
}

// stringValue decodes a text value; binary values arrive base64 with meta.encoding set.
func stringValue(value any, meta map[string]any) (string, error) {
	s, ok := value.(string)
	if !ok {
		return "", contract.Invalid("string value must be text")
	}

	if meta["encoding"] == "base64" {
		b, err := base64.StdEncoding.DecodeString(s)
		if err != nil {
			return "", contract.Invalid("invalid base64 value: %v", err)
		}

		return string(b), nil
	}

	return s, nil
}

// fill queues the commands that build a collection key from the API value shape.
func fill(ctx context.Context, p redis.Pipeliner, t, key string, value any) error {
	switch t {
	case "hash":
		m, ok := value.(map[string]any)
		if !ok || len(m) == 0 {
			return contract.Invalid("hash needs at least one field")
		}

		args := make([]any, 0, len(m)*2)
		for f, v := range m {
			args = append(args, f, fmt.Sprint(v))
		}

		p.HSet(ctx, key, args...)
	case "list", "set":
		vals, ok := value.([]any)
		if !ok || len(vals) == 0 {
			return contract.Invalid("%s needs at least one member", t)
		}

		if t == "list" {
			p.RPush(ctx, key, vals...)
		} else {
			p.SAdd(ctx, key, vals...)
		}
	case "zset":
		vals, ok := value.([]any)
		if !ok || len(vals) == 0 {
			return contract.Invalid("sorted set needs at least one member")
		}

		zs := make([]redis.Z, 0, len(vals))

		for _, v := range vals {
			m, ok := v.(map[string]any)
			if !ok {
				return contract.Invalid("sorted set members need member and score")
			}

			score, ok := m["score"].(float64)
			if !ok {
				return contract.Invalid("sorted set score must be a number")
			}

			zs = append(zs, redis.Z{Member: fmt.Sprint(m["member"]), Score: score})
		}

		p.ZAdd(ctx, key, zs...)
	default:
		return contract.Invalid("type %q is read-only", t)
	}

	return nil
}

func (r *Repository) Insert(ctx context.Context, containerID string, in contract.ItemInput) (string, error) {
	db, err := dbIndex(containerID)
	if err != nil {
		return "", err
	}

	if in.ID == "" {
		return "", contract.Invalid("key name is required")
	}

	c := r.client(db)
	defer r.release(c)

	exists, err := c.Exists(ctx, in.ID).Result()
	if err != nil {
		return "", err
	}

	if exists > 0 {
		return "", contract.Invalid("key %q already exists", in.ID)
	}

	kind, _ := in.Meta["kind"].(string)
	if kind == "" {
		kind = map[contract.ViewKind]string{
			contract.ViewText: "string", contract.ViewFields: "hash", contract.ViewList: "list", contract.ViewSet: "set",
		}[in.View]
	}

	if kind == "string" {
		s, err := stringValue(in.Value, in.Meta)
		if err != nil {
			return "", err
		}

		return in.ID, c.SetNX(ctx, in.ID, s, 0).Err()
	}

	_, err = c.TxPipelined(ctx, func(p redis.Pipeliner) error { return fill(ctx, p, kind, in.ID, in.Value) })

	return in.ID, err
}

// Delete removes keys with UNLINK (non-blocking free). Batches are bounded.
func (r *Repository) Delete(ctx context.Context, containerID string, itemIDs []string) error {
	db, err := dbIndex(containerID)
	if err != nil {
		return err
	}

	if len(itemIDs) > maxDeleteBatch {
		return contract.Invalid("at most %d keys per delete", maxDeleteBatch)
	}

	c := r.client(db)
	defer r.release(c)

	return c.Unlink(ctx, itemIDs...).Err()
}

func collectionLen(ctx context.Context, c *redis.Client, t, key string) (int64, error) {
	switch t {
	case "hash":
		return c.HLen(ctx, key).Result()
	case "list":
		return c.LLen(ctx, key).Result()
	case "set":
		return c.SCard(ctx, key).Result()
	case "zset":
		return c.ZCard(ctx, key).Result()
	default:
		return 0, nil
	}
}
