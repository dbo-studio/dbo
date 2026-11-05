package databaseRedis

import (
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// cliIdle closes an unused CLI connection so abandoned tabs do not hold a server connection.
const cliIdle = 10 * time.Minute

type cliSession struct {
	client *redis.Client
	timer  *time.Timer
}

// cliSessions holds one dedicated, single-connection client per (owner, connection). SELECT, MULTI and WATCH typed
// in the CLI therefore never leak into the shared per-db clients that the key browser uses.
var (
	cliMu       sync.Mutex
	cliSessions = map[clientKey]*cliSession{}
)

func closeCLI(owner string, connID uint) {
	cliMu.Lock()
	defer cliMu.Unlock()

	for k, s := range cliSessions {
		if k.owner == owner && k.connID == connID {
			s.timer.Stop()

			_ = s.client.Close()
			delete(cliSessions, k)
		}
	}
}

// cliClient returns the CLI connection, opening it on first use. Unsaved connections get a throwaway client.
func (r *Repository) cliClient() *redis.Client {
	o := r.options(int(r.opts.Database))
	o.PoolSize = 1 // one connection: session state (SELECT, MULTI) stays on it

	cliMu.Lock()
	defer cliMu.Unlock()

	k := clientKey{owner: r.owner, connID: r.conn.ID}
	if s, ok := cliSessions[k]; ok {
		s.timer.Reset(cliIdle)

		return s.client
	}

	s := &cliSession{client: redis.NewClient(o)}
	s.timer = time.AfterFunc(cliIdle, func() { closeCLI(k.owner, k.connID) })
	cliSessions[k] = s

	return s.client
}
