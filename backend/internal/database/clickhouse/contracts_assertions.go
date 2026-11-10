package databaseClickhouse

import generic "github.com/dbo-studio/dbo/internal/database/generic"

var (
	_ generic.Dialect                 = clickhouse{}
	_ generic.Constraints             = clickhouse{}
	_ generic.Dumper                  = clickhouse{}
	_ generic.TableOptionsDialect     = clickhouse{}
	_ generic.MutationDialect         = clickhouse{}
	_ generic.MaterializedViewDialect = clickhouse{}
	_ generic.InsightDialect          = clickhouse{}
)
