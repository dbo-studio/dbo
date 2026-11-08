package databaseClickhouse

import (
	"context"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"gorm.io/gorm"
)

// DumpTable uses the server's own SHOW CREATE TABLE.
func (c clickhouse) DumpTable(_ context.Context, db *gorm.DB, ns, table string) (contract.TableDDL, error) {
	var create string
	if err := db.Raw(`SELECT create_table_query FROM system.tables WHERE database = ? AND name = ?`, ns, table).Scan(&create).Error; err != nil {
		return contract.TableDDL{}, err
	}

	return contract.TableDDL{Name: table, Create: strings.TrimSpace(create) + ";"}, nil
}
