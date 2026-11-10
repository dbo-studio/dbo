package databaseContract

import "context"

// AtomicExecutor is implemented by drivers whose DDL is transactional
// (PostgreSQL, SQLite). ExecuteAtomic runs every step in one transaction, so a
// failing step leaves the database untouched. Drivers without it (MySQL
// auto-commits DDL) are run step by step by the caller.
type AtomicExecutor interface {
	ExecuteAtomic(ctx context.Context, steps []ExecuteStep) error
}
