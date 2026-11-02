package databaseContract

import "context"

// WritePreviewRepository counts the rows INSERT, UPDATE or DELETE statements
// would change without changing them: they run in order in one transaction
// that is always rolled back, so each sees what the ones before it did.
type WritePreviewRepository interface {
	PreviewWrite(ctx context.Context, statements []string, database, schema *string) ([]int64, error)
}
