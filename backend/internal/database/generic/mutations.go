package databaseGeneric

// MutationDialect is implemented by dialects that cannot use plain UPDATE/DELETE (ClickHouse: ALTER TABLE ... UPDATE).
// They also have no row identity and no transactions, so a row is matched on every column it was read with.
type MutationDialect interface {
	// Literal renders a JSON value as a SQL literal.
	Literal(v any) string
	UpdateStatement(target string, set, where []string) string
	DeleteStatement(target string, where []string) string
}

func (r *Repository) mutationDialect() (MutationDialect, bool) {
	d, ok := r.d.(MutationDialect)

	return d, ok
}

func (r *Repository) literal(v any) string {
	if m, ok := r.mutationDialect(); ok {
		return m.Literal(v)
	}

	return literal(v)
}
