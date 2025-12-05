package databaseSqlite

import (
	"fmt"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

func (r *SQLiteRepository) getNewTableName(tableParams *dto.SQLiteTableParams, oldName string) string {
	if tableParams.New != nil && tableParams.New.Name != nil && *tableParams.New.Name != "" {
		return *tableParams.New.Name
	}
	return oldName
}

func (r *SQLiteRepository) filterActiveColumns(columns []dto.SQLiteTableColumn) []dto.SQLiteTableColumn {
	return lo.Filter(columns, func(col dto.SQLiteTableColumn, _ int) bool {
		if col.Added != nil && col.Deleted != nil && *col.Added && *col.Deleted {
			return false
		}
		if col.Added == nil || *col.Added {
			return true
		}
		return col.New != nil
	})
}

func (r *SQLiteRepository) filterActiveForeignKeys(foreignKeys []dto.SQLiteTableForeignKey) []dto.SQLiteTableForeignKey {
	return lo.Filter(foreignKeys, func(fk dto.SQLiteTableForeignKey, _ int) bool {
		if fk.Added != nil && fk.Deleted != nil && *fk.Added && *fk.Deleted {
			return false
		}
		if fk.Added == nil || *fk.Added {
			return true
		}
		return fk.New != nil
	})
}

func (r *SQLiteRepository) filterActiveKeys(keys []dto.SQLiteTableKey) []dto.SQLiteTableKey {
	return lo.Filter(keys, func(key dto.SQLiteTableKey, _ int) bool {
		if key.Added != nil && key.Deleted != nil && *key.Added && *key.Deleted {
			return false
		}
		if key.Added == nil || *key.Added {
			return true
		}
		return key.New != nil
	})
}

func (r *SQLiteRepository) getKeyType(keyType *string) string {
	if keyType == nil {
		return ""
	}

	switch *keyType {
	case "PRIMARY", "PRIMARY KEY":
		return "PRIMARY KEY"
	case "UNIQUE":
		return "UNIQUE"
	default:
		return ""
	}
}

func (r *SQLiteRepository) quoteColumnList(columns []string) string {
	quoted := make([]string, len(columns))
	for i, col := range columns {
		quoted[i] = quoteIdent(col)
	}
	return strings.Join(quoted, ", ")
}

func (r *SQLiteRepository) isIndexRenamed(idx dto.SQLiteIndex) bool {
	return idx.New != nil && idx.Old != nil &&
		idx.New.Name != nil && idx.Old.Name != nil &&
		*idx.New.Name != *idx.Old.Name
}

func (r *SQLiteRepository) getCommonColumns(columnParams *dto.SQLiteTableColumnParams) []string {
	if columnParams == nil || len(columnParams.Columns) == 0 {
		return []string{}
	}

	commonColumns := make([]string, 0)
	for _, col := range columnParams.Columns {
		if r.isColumnAddedOrDeleted(col) {
			continue
		}

		colName := r.getColumnName(col)
		if colName != "" {
			commonColumns = append(commonColumns, quoteIdent(colName))
		}
	}

	return commonColumns
}

func (r *SQLiteRepository) isColumnAddedOrDeleted(col dto.SQLiteTableColumn) bool {
	return (col.Added != nil && *col.Added) || (col.Deleted != nil && *col.Deleted)
}

func (r *SQLiteRepository) getColumnName(col dto.SQLiteTableColumn) string {
	if col.New != nil && col.New.Name != nil {
		return *col.New.Name
	}
	if col.Old != nil && col.Old.Name != nil {
		return *col.Old.Name
	}
	return ""
}

func (r *SQLiteRepository) getUniqueTmpTableName(baseName string) string {
	baseTmpName := "__tmp_" + baseName

	if !r.tableExists(baseTmpName) {
		return baseTmpName
	}

	for i := 1; i < 1000; i++ {
		candidateName := fmt.Sprintf("%s_%d", baseTmpName, i)
		if !r.tableExists(candidateName) {
			return candidateName
		}
	}

	return fmt.Sprintf("%s_%d", baseTmpName, time.Now().Unix())
}

func (r *SQLiteRepository) tableExists(tableName string) bool {
	var count int64
	r.db.Table("sqlite_master").
		Where("type = 'table' AND name = ?", tableName).
		Count(&count)
	return count > 0
}

func quoteIdent(name string) string {
	if name == "" {
		return name
	}
	return "\"" + strings.ReplaceAll(name, "\"", "") + "\""
}
