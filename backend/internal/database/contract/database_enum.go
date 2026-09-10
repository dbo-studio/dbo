package databaseContract

const (
	Postgresql = "postgresql"
	Mysql      = "mysql"
	Mariadb    = "mariadb"
	Sqlite     = "sqlite"
	SQLServer  = "sqlserver"

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

// ValidConnectionTypes is every type Create/Ping may accept.
var ValidConnectionTypes = append(append(append([]string{}, PostgresFamily...), MysqlFamily...), Sqlite, SQLServer)

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
	default:
		if connectionType == "" {
			return "database"
		}

		return connectionType
	}
}
