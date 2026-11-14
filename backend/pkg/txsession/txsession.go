// Package txsession keeps one open database transaction per editor tab, so several queries can run on the
// same connection before the user commits or rolls back.
package txsession

import (
	"context"
	"errors"
	"sync"
	"time"

	"gorm.io/gorm"
)

// IdleTimeout is how long an unused transaction stays open before it is rolled back, so a forgotten one
// does not hold locks.
const IdleTimeout = 10 * time.Minute

var (
	ErrActive  = errors.New("a transaction is already open in this tab")
	ErrMissing = errors.New("no open transaction in this tab; it was rolled back or timed out")
)

// Key identifies a transaction: the user, the connection and the editor tab.
type Key struct {
	Owner        string
	ConnectionID int32
	Tab          string
}

type session struct {
	mu    sync.Mutex // one statement at a time on the pinned connection
	tx    *gorm.DB
	timer *time.Timer
}

type Store struct {
	mu       sync.Mutex
	sessions map[Key]*session
}

func NewStore() *Store { return &Store{sessions: map[Key]*session{}} }

// Begin opens a transaction on db. It runs on its own context: the request's would roll it back when the
// request ends.
func (s *Store) Begin(key Key, db *gorm.DB) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.sessions[key]; ok {
		return ErrActive
	}

	tx := db.WithContext(context.Background()).Begin()
	if tx.Error != nil {
		return tx.Error
	}

	sess := &session{tx: tx}
	sess.timer = time.AfterFunc(IdleTimeout, func() { _ = s.End(key, false) })
	s.sessions[key] = sess

	return nil
}

func (s *Store) Active(key Key) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, ok := s.sessions[key]

	return ok
}

// Use runs fn with the transaction, one caller at a time, and restarts the idle timer.
func (s *Store) Use(key Key, fn func(tx *gorm.DB) error) error {
	s.mu.Lock()
	sess, ok := s.sessions[key]
	s.mu.Unlock()

	if !ok {
		return ErrMissing
	}

	sess.mu.Lock()
	defer sess.mu.Unlock()

	sess.timer.Reset(IdleTimeout)

	return fn(sess.tx)
}

// End commits or rolls back the transaction and frees its connection.
func (s *Store) End(key Key, commit bool) error {
	s.mu.Lock()
	sess, ok := s.sessions[key]
	delete(s.sessions, key)
	s.mu.Unlock()

	if !ok {
		return ErrMissing
	}

	sess.timer.Stop()
	sess.mu.Lock()
	defer sess.mu.Unlock()

	if commit {
		return sess.tx.Commit().Error
	}

	return sess.tx.Rollback().Error
}

type ctxKey struct{}

// WithTx returns ctx carrying tx, for the repository layer to run on instead of its own connection.
func WithTx(ctx context.Context, tx *gorm.DB) context.Context {
	return context.WithValue(ctx, ctxKey{}, tx)
}

// FromCtx returns the transaction set by WithTx, or nil.
func FromCtx(ctx context.Context) *gorm.DB {
	tx, _ := ctx.Value(ctxKey{}).(*gorm.DB)

	return tx
}
