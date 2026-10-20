package databaseContract

import "context"

// WritePreviewRepository counts the rows an INSERT, UPDATE or DELETE would
// change without changing them: the statement runs in a transaction that is
// always rolled back.
type WritePreviewRepository interface {
	PreviewWrite(ctx context.Context, sql string, database, schema *string) (int64, error)
}
