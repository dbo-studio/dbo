package databaseContract

import "context"

// TableDDL is the schema of one table split so a dump can load without FK or
// ordering errors: Create is the table itself, Post (indexes, deferred foreign
// keys, sequence resets) runs after every table and its data are loaded.
type TableDDL struct {
	Name      string
	Create    string
	Post      []string
	DependsOn []string
	// GeneratedColumns are computed by the database and cannot be inserted.
	GeneratedColumns []string
	// OverridingIdentity is set when INSERT must carry OVERRIDING SYSTEM VALUE
	// to load rows into a GENERATED ALWAYS identity column.
	OverridingIdentity bool
}

// SchemaDump holds dialect-specific statements that wrap the whole dump.
type SchemaDump struct {
	Preamble  []string
	Postamble []string
	Tables    []TableDDL
}

type SchemaDumpRepository interface {
	// DumpSchema returns the DDL of the given tables, in the order given.
	DumpSchema(ctx context.Context, database, schema *string, tables []string) (*SchemaDump, error)
}

// Ordered returns tables parents-first. Tables in a foreign-key cycle keep
// their input order after the rest; dialects handle them in Preamble/Post.
func (d *SchemaDump) Ordered() []TableDDL {
	byName := make(map[string]TableDDL, len(d.Tables))
	for _, t := range d.Tables {
		byName[t.Name] = t
	}

	ordered := make([]TableDDL, 0, len(d.Tables))
	placed := make(map[string]bool, len(d.Tables))
	remaining := append([]TableDDL(nil), d.Tables...)

	for len(remaining) > 0 {
		var next []TableDDL

		for _, t := range remaining {
			ready := true

			for _, dep := range t.DependsOn {
				if _, known := byName[dep]; known && dep != t.Name && !placed[dep] {
					ready = false

					break
				}
			}

			if ready {
				ordered = append(ordered, t)
				placed[t.Name] = true
			} else {
				next = append(next, t)
			}
		}

		if len(next) == len(remaining) {
			return append(ordered, next...)
		}

		remaining = next
	}

	return ordered
}
