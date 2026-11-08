package databaseGeneric

import (
	"context"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"gorm.io/gorm"
)

// Dumper is implemented by dialects that can write a table's DDL.
type Dumper interface {
	DumpTable(ctx context.Context, db *gorm.DB, ns, table string) (contract.TableDDL, error)
}

// DumpSchema returns the DDL of tables in the order given. Foreign keys and indexes go in Post, so a
// dump loads without ordering errors.
func (r *Repository) DumpSchema(ctx context.Context, database, schema *string, tables []string) (*contract.SchemaDump, error) {
	d, ok := r.d.(Dumper)
	if !ok {
		return nil, apperror.Validation(errUnsupportedForm)
	}

	ns, err := r.resolveNamespace(ctx, database, schema)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	db := r.base.DB().WithContext(ctx)
	dump := &contract.SchemaDump{}

	for _, name := range tables {
		ddl, err := d.DumpTable(ctx, db, ns, name)
		if err != nil {
			return nil, apperror.DriverError(err)
		}

		dump.Tables = append(dump.Tables, ddl)
	}

	return dump, nil
}
