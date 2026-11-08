package databaseClickhouse

import generic "github.com/dbo-studio/dbo/internal/database/generic"

var (
	_ generic.Dialect     = clickhouse{}
	_ generic.Constraints = clickhouse{}
	_ generic.Dumper      = clickhouse{}
)
