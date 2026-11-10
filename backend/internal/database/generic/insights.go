package databaseGeneric

// Insight is a read-only server view offered in the tree: it opens the SQL editor with Query and runs it.
type Insight struct{ Title, Query string }

// InsightDialect is implemented by dialects with system tables worth one click (ClickHouse: processes, parts, merges).
type InsightDialect interface {
	Insights() []Insight
}
