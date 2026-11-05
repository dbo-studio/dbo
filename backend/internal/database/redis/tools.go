package databaseRedis

import (
	"context"
	"errors"
	"fmt"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/redis/go-redis/v9"
)

// readCommands run without confirmation. Anything not listed here is a write; blocked/destructive are below.
var readCommands = setOf(
	"GET", "MGET", "EXISTS", "TTL", "PTTL", "TYPE", "STRLEN", "GETRANGE", "HGET", "HGETALL", "HLEN", "HMGET", "HKEYS", "HVALS",
	"HEXISTS", "HSCAN", "LLEN", "LRANGE", "LINDEX", "SCARD", "SMEMBERS", "SISMEMBER", "SSCAN", "ZCARD", "ZRANGE", "ZRANGEBYSCORE",
	"ZREVRANGE", "ZSCORE", "ZRANK", "ZSCAN", "ZCOUNT", "SCAN", "DBSIZE", "PING", "ECHO", "TIME", "INFO", "XLEN", "XRANGE",
	"XREVRANGE", "XINFO", "PUBSUB", "OBJECT", "MEMORY", "RANDOMKEY", "LASTSAVE", "DUMP", "BITCOUNT", "GETBIT", "PFCOUNT",
	"GEOPOS", "GEODIST", "GEOSEARCH", "SRANDMEMBER", "SINTER", "SUNION", "SDIFF",
	// The CLI runs on its own connection, so SELECT only affects the CLI.
	"SELECT",
)

// blockedCommands are never run from DBO: they hang, escape the data model, or take the server down.
var blockedCommands = setOf(
	"KEYS", "DEBUG", "SHUTDOWN", "MODULE", "MIGRATE", "SCRIPT", "EVAL", "EVALSHA", "EVAL_RO", "EVALSHA_RO", "FUNCTION", "FCALL",
	"MONITOR", "SUBSCRIBE", "PSUBSCRIBE", "SSUBSCRIBE", "SYNC", "PSYNC", "REPLICAOF", "SLAVEOF", "CLUSTER", "FAILOVER",
	"SAVE", "BGSAVE", "BGREWRITEAOF", "BLPOP", "BRPOP", "BRPOPLPUSH", "BLMOVE", "BZPOPMIN", "BZPOPMAX", "XREAD", "XREADGROUP",
	"WAIT", "CLIENT", "ACL",
)

var destructiveCommands = setOf("FLUSHALL", "FLUSHDB", "DEL", "UNLINK", "RENAME", "RESTORE")

func setOf(names ...string) map[string]bool {
	m := make(map[string]bool, len(names))
	for _, n := range names {
		m[n] = true
	}

	return m
}

// Classify rates one operation for Safe Mode. Raw holds the command text for CLI operations.
func (r *Repository) Classify(op contract.Operation) contract.SafetyClass {
	switch op.Name {
	case "browse", "get":
		return contract.SafetyRead
	case "save", "insert":
		return contract.SafetyWrite
	case "delete":
		if op.Count > 1 {
			return contract.SafetyDestructive
		}

		return contract.SafetyWrite
	case "publish":
		return contract.SafetyWrite
	case "bulk-delete":
		return contract.SafetyDestructive
	case "command":
		return classifyCommand(op.Raw)
	default:
		return contract.SafetyBlocked
	}
}

func classifyCommand(raw string) contract.SafetyClass {
	args, err := splitArgs(raw)
	if err != nil || len(args) == 0 {
		return contract.SafetyBlocked
	}

	name := strings.ToUpper(args[0])

	// CONFIG GET is a read; CONFIG SET/REWRITE/RESETSTAT are not allowed.
	if name == "CONFIG" {
		if len(args) > 1 && strings.EqualFold(args[1], "GET") {
			return contract.SafetyRead
		}

		return contract.SafetyBlocked
	}

	switch {
	case blockedCommands[name]:
		return contract.SafetyBlocked
	case destructiveCommands[name]:
		return contract.SafetyDestructive
	case readCommands[name]:
		return contract.SafetyRead
	default:
		return contract.SafetyWrite
	}
}

// splitArgs splits a redis-cli style line: whitespace separated, with "double" and 'single' quotes and backslash escapes.
func splitArgs(line string) ([]string, error) {
	var (
		args  []string
		cur   strings.Builder
		quote rune
		inArg bool
	)

	rs := []rune(line)
	for i := 0; i < len(rs); i++ {
		ch := rs[i]

		switch {
		case quote != 0 && ch == '\\' && quote == '"' && i+1 < len(rs):
			i++
			cur.WriteRune(unescape(rs[i]))
		case quote != 0 && ch == quote:
			quote = 0
		case quote != 0:
			cur.WriteRune(ch)
		case ch == '"' || ch == '\'':
			quote, inArg = ch, true
		case ch == ' ' || ch == '\t' || ch == '\n':
			if inArg {
				args = append(args, cur.String())
				cur.Reset()

				inArg = false
			}
		default:
			cur.WriteRune(ch)

			inArg = true
		}
	}

	if quote != 0 {
		return nil, errors.New("unbalanced quotes")
	}

	if inArg {
		args = append(args, cur.String())
	}

	return args, nil
}

func unescape(r rune) rune {
	switch r {
	case 'n':
		return '\n'
	case 't':
		return '\t'
	case 'r':
		return '\r'
	default:
		return r
	}
}

// RunCommand runs one command on the connection's default db. Safe Mode classification happens in the service before this call.
func (r *Repository) RunCommand(ctx context.Context, input string) (*contract.CommandResult, error) {
	args, err := splitArgs(input)
	if err != nil {
		return nil, err
	}

	if len(args) == 0 {
		return nil, errors.New("empty command")
	}

	c := r.cliClient()

	iargs := make([]any, len(args))
	for i, a := range args {
		iargs[i] = a
	}

	res, err := c.Do(ctx, iargs...).Result()
	if errors.Is(err, redis.Nil) {
		return &contract.CommandResult{Output: nil}, nil
	}

	if err != nil {
		return nil, err
	}

	return &contract.CommandResult{Output: normalize(res)}, nil
}

// normalize turns reply values into JSON-friendly ones (maps to string-keyed, bytes to text).
func normalize(v any) any {
	switch x := v.(type) {
	case []any:
		out := make([]any, len(x))
		for i, e := range x {
			out[i] = normalize(e)
		}

		return out
	case map[any]any:
		out := make(map[string]any, len(x))
		for k, e := range x {
			out[fmt.Sprint(k)] = normalize(e)
		}

		return out
	case map[string]any:
		out := make(map[string]any, len(x))
		for k, e := range x {
			out[k] = normalize(e)
		}

		return out
	case []byte:
		return string(x)
	default:
		return x
	}
}

const maxChannels = 500

// Channels lists active channels matching pattern (PUBSUB CHANNELS), capped.
func (r *Repository) Channels(ctx context.Context, pattern string) ([]string, error) {
	c := r.client(int(r.opts.Database))
	defer r.release(c)

	if pattern == "" {
		pattern = "*"
	}

	chans, err := c.PubSubChannels(ctx, pattern).Result()
	if err != nil {
		return nil, err
	}

	if len(chans) > maxChannels {
		chans = chans[:maxChannels]
	}

	return chans, nil
}

func (r *Repository) Publish(ctx context.Context, channel, msg string) (int64, error) {
	c := r.client(int(r.opts.Database))
	defer r.release(c)

	return c.Publish(ctx, channel, msg).Result()
}

// Subscribe uses a dedicated client (never the shared one) and closes it when ctx is done.
func (r *Repository) Subscribe(ctx context.Context, channels []string, out chan<- contract.Message) error {
	c := redis.NewClient(r.options(int(r.opts.Database)))
	defer func() { _ = c.Close() }()

	var exact, patterns []string

	for _, ch := range channels {
		if strings.ContainsAny(ch, "*?[") {
			patterns = append(patterns, ch)
		} else {
			exact = append(exact, ch)
		}
	}

	ps := c.Subscribe(ctx, exact...)
	defer func() { _ = ps.Close() }()

	if len(patterns) > 0 {
		if err := ps.PSubscribe(ctx, patterns...); err != nil {
			return err
		}
	}

	// Subscribe with no exact channels would be an error; the PSubscribe above covers that case.
	msgs := ps.Channel()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case m, ok := <-msgs:
			if !ok {
				return nil
			}

			select {
			case out <- contract.Message{Channel: m.Channel, Payload: m.Payload}:
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	}
}
