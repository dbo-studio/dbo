package databaseGeneric

import (
	"context"
	"maps"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

// TableOptionsDialect is implemented by dialects whose tables carry storage settings beyond their columns
// (ClickHouse: engine, ORDER BY, PARTITION BY, TTL, SETTINGS). The Storage tab holds them as plain text fields,
// so nothing is parsed back out of the server beyond what it reports.
type TableOptionsDialect interface {
	// StorageFields lists the Storage tab fields. create is true for a table that does not exist yet.
	StorageFields(create bool) []contract.FormField
	StorageRow(ctx context.Context, db *gorm.DB, namespace, table string) (map[string]any, error)
	// CreateTableWith is CreateTable plus the Storage tab values (already trimmed).
	CreateTableWith(namespace, table string, cols []ColSpec, opts map[string]string) (string, error)
	// AlterStorage returns the statements that turn the old Storage values into the new ones.
	AlterStorage(namespace, table string, old, next map[string]string) ([]string, error)
}

func (r *Repository) storageDialect() (TableOptionsDialect, bool) {
	d, ok := r.d.(TableOptionsDialect)

	return d, ok
}

// storageValues reads the Storage tab of an Object Form submission: a single row, whose New values are laid over the Old
// ones, because an edited row may carry only what changed and a missing value must not read as "cleared".
func storageValues(params []byte) (old, next map[string]string, err error) {
	rows, err := parseTab[map[string]any](params, contract.TableStorageTab)
	if err != nil {
		return nil, nil, err
	}

	for _, row := range rows {
		if row.New == nil || lo.FromPtr(row.Deleted) {
			continue
		}

		old = map[string]string{}
		if row.Old != nil {
			old = stringMap(*row.Old)
		}

		next = maps.Clone(old)
		maps.Copy(next, stringMap(*row.New))

		return old, next, nil
	}

	return nil, nil, nil
}

func stringMap(in map[string]any) map[string]string {
	out := make(map[string]string, len(in))

	for k, v := range in {
		if s, ok := v.(string); ok {
			out[k] = strings.TrimSpace(s)
		}
	}

	return out
}
