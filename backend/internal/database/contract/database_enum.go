package databaseContract

import (
	"os"
	"slices"
)

const (
	Postgresql = "postgresql"
	Mysql      = "mysql"
	Mariadb    = "mariadb"
	Sqlite     = "sqlite"
	SQLServer  = "sqlserver"
	ClickHouse = "clickhouse"

	// Redis and its wire-compatible variants share one driver.
	Redis     = "redis"
	Valkey    = "valkey"
	KeyDB     = "keydb"
	Dragonfly = "dragonfly"

	Mongo = "mongodb"

	// PostgreSQL-protocol branding aliases (same dialer/repo as Postgresql).
	Supabase           = "supabase"
	Neon               = "neon"
	AlloyDB            = "alloydb"
	TimescaleDB        = "timescaledb"
	RDSPostgresql      = "rds_postgresql"
	AuroraPostgresql   = "aurora_postgresql"
	CloudSQLPostgresql = "cloudsql_postgresql"
	AzurePostgresql    = "azure_postgresql"

	// MySQL-protocol branding aliases (same dialer/repo as Mysql).
	RDSMysql      = "rds_mysql"
	AuroraMysql   = "aurora_mysql"
	CloudSQLMysql = "cloudsql_mysql"
	AzureMysql    = "azure_mysql"
	Percona       = "percona"
	HeatWave      = "heatwave"
)

// PostgresFamily connection types that use the PostgreSQL wire stack.
var PostgresFamily = []string{
	Postgresql,
	Supabase,
	Neon,
	AlloyDB,
	TimescaleDB,
	RDSPostgresql,
	AuroraPostgresql,
	CloudSQLPostgresql,
	AzurePostgresql,
}

// MysqlFamily connection types that use the MySQL wire stack.
var MysqlFamily = []string{
	Mysql,
	Mariadb,
	RDSMysql,
	AuroraMysql,
	CloudSQLMysql,
	AzureMysql,
	Percona,
	HeatWave,
}

// RedisFamily lists the connection types served by the Redis driver.
var RedisFamily = []string{Redis, Valkey, KeyDB, Dragonfly}

// ValidConnectionTypes is every type Create/Ping may accept.
var ValidConnectionTypes = append(append(append(append([]string{}, PostgresFamily...), MysqlFamily...), RedisFamily...), Sqlite, SQLServer, ClickHouse, Mongo)

// NoSQLFixture is the in-memory test driver. It is deliberately absent from
// ValidConnectionTypes, so it can never be created as a user connection.
const NoSQLFixture = "nosql_fixture"

// NoSQLFixtureEnabled gates the fixture type; it is on only for e2e runs.
func NoSQLFixtureEnabled() bool { return os.Getenv("DBO_ENABLE_NOSQL_FIXTURE") == "1" }

// NoSQLTypes lists connection types served by NoSQLRepository instead of DatabaseRepository.
var NoSQLTypes = append(append([]string{NoSQLFixture}, RedisFamily...), Mongo)

// IsHostSQL reports whether connectionType is a host/port SQL server served by the generic driver.
func IsHostSQL(connectionType string) bool {
	return connectionType == SQLServer || connectionType == ClickHouse
}

// IsMongo reports whether connectionType uses the MongoDB driver.
func IsMongo(connectionType string) bool { return connectionType == Mongo }

// IsRedisFamily reports whether connectionType uses the Redis driver.
func IsRedisFamily(connectionType string) bool { return slices.Contains(RedisFamily, connectionType) }

// IsNoSQL reports whether connectionType is served by NoSQLRepository.
func IsNoSQL(connectionType string) bool {
	return slices.Contains(NoSQLTypes, connectionType)
}

// IsPostgresFamily reports whether connectionType uses the PostgreSQL wire stack.
func IsPostgresFamily(connectionType string) bool {
	for _, t := range PostgresFamily {
		if connectionType == t {
			return true
		}
	}

	return false
}

// IsMysqlFamily reports whether connectionType uses the MySQL wire stack.
func IsMysqlFamily(connectionType string) bool {
	for _, t := range MysqlFamily {
		if connectionType == t {
			return true
		}
	}

	return false
}

// TreeIcon returns the sidebar/tree icon key for a connection type.
func TreeIcon(connectionType string) string {
	switch connectionType {
	case Sqlite:
		return "sqlite"
	case SQLServer:
		return "sqlserver"
	case ClickHouse:
		return "clickhouse"
	default:
		if connectionType == "" {
			return "database"
		}

		return connectionType
	}
}
