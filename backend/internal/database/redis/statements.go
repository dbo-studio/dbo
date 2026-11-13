package databaseRedis

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/redis/go-redis/v9"
)

var _ contract.StatementWriter = (*Repository)(nil)

const (
	previewKeys  = 5
	maxValueText = 200
	// maxUndoValue bounds a string value that is put back as a statement.
	maxUndoValue = 64 << 10
)

// keysOf is the keys a write command touches: every argument of DEL and UNLINK, the first argument of the rest.
func keysOf(args []string) []string {
	if len(args) < 2 {
		return nil
	}

	switch strings.ToUpper(args[0]) {
	case "DEL", "UNLINK":
		return args[1:]
	}

	return args[1:2]
}

// wholeDatabase are the commands that wipe every key; the assistant never proposes them.
var wholeDatabase = setOf("FLUSHALL", "FLUSHDB")

func (r *Repository) PreviewStatement(ctx context.Context, statement string) (*contract.WritePreview, error) {
	db, text := splitDB(statement)

	args, err := splitArgs(text)
	if err != nil {
		return nil, err
	}

	if len(args) > 0 && wholeDatabase[strings.ToUpper(args[0])] {
		return nil, contract.Invalid("wiping a whole database cannot be proposed; ask the user to run it themselves")
	}

	keys := keysOf(args)
	if len(keys) == 0 {
		return &contract.WritePreview{Note: "it names no key"}, nil
	}

	c, release := r.statementClient(db)
	defer release()

	out := &contract.WritePreview{}
	name := strings.ToUpper(args[0])

	for i, key := range keys {
		exists, err := c.Exists(ctx, key).Result()
		if err != nil {
			return nil, err
		}

		// A DEL only touches keys that exist; any other write creates or changes its key.
		if exists > 0 || name != "DEL" && name != "UNLINK" {
			out.Affected++
		}

		if i >= previewKeys {
			continue
		}

		typ, _ := c.Type(ctx, key).Result()
		line := key + " (" + typ + ")"

		if typ == "string" {
			if v, err := c.Get(ctx, key).Result(); err == nil {
				line += " = " + clip(v)
			}
		}

		out.Sample = append(out.Sample, line)
	}

	if len(keys) > previewKeys {
		out.Note = fmt.Sprintf("showing %d of %d keys", previewKeys, len(keys))
	}

	return out, nil
}

func clip(v string) string {
	if len(v) > maxValueText {
		return v[:maxValueText] + "…"
	}

	return v
}

func (r *Repository) CaptureStatement(ctx context.Context, statement string) (*contract.StatementCapture, error) {
	db, text := splitDB(statement)

	args, err := splitArgs(text)
	if err != nil {
		return nil, err
	}

	keys := keysOf(args)
	if len(keys) == 0 {
		return &contract.StatementCapture{Note: "it names no key"}, nil
	}

	c, release := r.statementClient(db)
	defer release()

	// An undo statement runs on the same database as the write it takes back.
	prefix := ""
	if db >= 0 {
		prefix = "SELECT " + strconv.Itoa(db) + "\n"
	}

	out := &contract.StatementCapture{}

	for _, key := range keys {
		undo, note, err := r.captureKey(ctx, c, key)
		if err != nil {
			return nil, err
		}

		for _, u := range undo {
			out.Undo = append(out.Undo, prefix+u)
		}

		if note != "" {
			out.Note = note
		}
	}

	return out, nil
}

// maxUndoElements bounds a hash, list, set or sorted set that is put back as statements.
const maxUndoElements = 1000

// captureKey reads one key's current value as the statements that rebuild it.
func (r *Repository) captureKey(ctx context.Context, c *redis.Client, key string) ([]string, string, error) {
	typ, err := c.Type(ctx, key).Result()
	if err != nil {
		return nil, "", err
	}

	if typ == "none" {
		// The key is new, so putting things back means removing it.
		return []string{"DEL " + quote(key)}, "", nil
	}

	build, note, err := r.rebuild(ctx, c, key, typ)
	if err != nil || build == nil {
		return nil, note, err
	}

	// Collections are replaced whole, so the changed key is cleared first; a string is simply overwritten.
	undo := build
	if typ != "string" {
		undo = append([]string{"DEL " + quote(key)}, build...)
	}

	if ttl, err := c.PTTL(ctx, key).Result(); err == nil && ttl > 0 {
		undo = append(undo, "PEXPIRE "+quote(key)+" "+strconv.FormatInt(ttl.Milliseconds(), 10))
	}

	return undo, "", nil
}

// rebuild is the command that recreates a key of the given type from its current value.
func (r *Repository) rebuild(ctx context.Context, c *redis.Client, key, typ string) ([]string, string, error) {
	tooBig := "it holds more than " + strconv.Itoa(maxUndoElements) + " elements, too many to put back"
	notText := "a value that is not plain text is not put back"

	switch typ {
	case "string":
		v, err := c.Get(ctx, key).Result()
		if err != nil {
			return nil, "", err
		}

		if !quotable(v) {
			return nil, notText, nil
		}

		return []string{"SET " + quote(key) + " " + quote(v)}, "", nil
	case "hash":
		if n, _ := c.HLen(ctx, key).Result(); n > maxUndoElements {
			return nil, tooBig, nil
		}

		h, err := c.HGetAll(ctx, key).Result()
		if err != nil {
			return nil, "", err
		}

		parts := []string{"HSET", quote(key)}

		for f, v := range h {
			if !quotable(f) || !quotable(v) {
				return nil, notText, nil
			}

			parts = append(parts, quote(f), quote(v))
		}

		return []string{strings.Join(parts, " ")}, "", nil
	case "list":
		if n, _ := c.LLen(ctx, key).Result(); n > maxUndoElements {
			return nil, tooBig, nil
		}

		return r.rebuildMembers(ctx, "RPUSH", key, func() ([]string, error) { return c.LRange(ctx, key, 0, -1).Result() }, notText)
	case "set":
		if n, _ := c.SCard(ctx, key).Result(); n > maxUndoElements {
			return nil, tooBig, nil
		}

		return r.rebuildMembers(ctx, "SADD", key, func() ([]string, error) { return c.SMembers(ctx, key).Result() }, notText)
	case "zset":
		if n, _ := c.ZCard(ctx, key).Result(); n > maxUndoElements {
			return nil, tooBig, nil
		}

		members, err := c.ZRangeWithScores(ctx, key, 0, -1).Result()
		if err != nil {
			return nil, "", err
		}

		parts := []string{"ZADD", quote(key)}

		for _, m := range members {
			name, _ := m.Member.(string)
			if !quotable(name) {
				return nil, notText, nil
			}

			parts = append(parts, strconv.FormatFloat(m.Score, 'g', -1, 64), quote(name))
		}

		return []string{strings.Join(parts, " ")}, "", nil
	default:
		return nil, "a " + typ + " key is not put back", nil
	}
}

func (r *Repository) rebuildMembers(_ context.Context, command, key string, read func() ([]string, error), notText string) ([]string, string, error) {
	members, err := read()
	if err != nil {
		return nil, "", err
	}

	if len(members) == 0 {
		return nil, "", nil
	}

	parts := []string{command, quote(key)}

	for _, m := range members {
		if !quotable(m) {
			return nil, notText, nil
		}

		parts = append(parts, quote(m))
	}

	return []string{strings.Join(parts, " ")}, "", nil
}

// quotable reports whether a value survives being written back as a double-quoted argument.
func quotable(v string) bool {
	if len(v) > maxUndoValue {
		return false
	}

	for _, r := range v {
		if r < ' ' && r != '\n' && r != '\t' && r != '\r' {
			return false
		}
	}

	return true
}

func quote(s string) string {
	r := strings.NewReplacer(`\`, `\\`, `"`, `\"`, "\n", `\n`, "\t", `\t`, "\r", `\r`)

	return `"` + r.Replace(s) + `"`
}
