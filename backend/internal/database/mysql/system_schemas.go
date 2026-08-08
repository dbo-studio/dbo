package databaseMysql

var mysqlSystemSchemas = []string{"information_schema", "mysql", "performance_schema", "sys"}

func isMySQLSystemSchema(schema string) bool {
	for _, s := range mysqlSystemSchemas {
		if schema == s {
			return true
		}
	}

	return false
}
