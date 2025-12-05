package databaseMysql

import (
	"regexp"
	"strings"

	"github.com/blastrain/vitess-sqlparser/sqlparser"
	"github.com/samber/lo"
)

type SQLParseResult struct {
	Tables   []string
	Views    []string
	Database *string
}

func (r *MySQLRepository) parseSQL(sqlText string) *SQLParseResult {
	result := &SQLParseResult{
		Tables: make([]string, 0),
		Views:  make([]string, 0),
	}

	cleanSQL := strings.TrimSpace(sqlText)
	if cleanSQL == "" {
		return result
	}

	stmt, err := sqlparser.Parse(cleanSQL)
	if err != nil {
		result.extractBasicInfo(cleanSQL)
		return result
	}

	result.extractFromStatement(stmt)
	return result
}

func (r *SQLParseResult) extractFromStatement(stmt sqlparser.Statement) {
	switch stmt := stmt.(type) {
	case *sqlparser.Select:
		r.extractFromSelect(stmt)
	case *sqlparser.Insert:
		r.extractFromInsert(stmt)
	case *sqlparser.Update:
		r.extractFromUpdate(stmt)
	case *sqlparser.Delete:
		r.extractFromDelete(stmt)
	}
}

func (r *SQLParseResult) extractFromSelect(stmt *sqlparser.Select) {
	if stmt.From != nil {
		for _, tableExpr := range stmt.From {
			if table, ok := tableExpr.(*sqlparser.AliasedTableExpr); ok {
				if tableName, ok := table.Expr.(sqlparser.TableName); ok {
					r.extractTableInfo(tableName)
				}
			}
		}
	}
}

func (r *SQLParseResult) extractFromInsert(stmt *sqlparser.Insert) {
	r.extractTableInfo(stmt.Table)
}

func (r *SQLParseResult) extractFromUpdate(stmt *sqlparser.Update) {
	for _, tableExpr := range stmt.TableExprs {
		if table, ok := tableExpr.(*sqlparser.AliasedTableExpr); ok {
			if tableName, ok := table.Expr.(sqlparser.TableName); ok {
				r.extractTableInfo(tableName)
			}
		}
	}
}

func (r *SQLParseResult) extractFromDelete(stmt *sqlparser.Delete) {
	for _, tableExpr := range stmt.TableExprs {
		if table, ok := tableExpr.(*sqlparser.AliasedTableExpr); ok {
			if tableName, ok := table.Expr.(sqlparser.TableName); ok {
				r.extractTableInfo(tableName)
			}
		}
	}
}

func (r *SQLParseResult) extractTableInfo(tableName sqlparser.TableName) {
	if tableName.Qualifier.String() != "" {
		r.Database = lo.ToPtr(tableName.Qualifier.String())
	}

	tableNameStr := tableName.Name.String()
	if tableNameStr != "" {
		r.Tables = append(r.Tables, tableNameStr)
	}
}

func (r *SQLParseResult) extractBasicInfo(sqlText string) {
	tablePatterns := []string{
		`(?i)FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)`,
		`(?i)JOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)`,
		`(?i)INSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)`,
		`(?i)UPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)`,
		`(?i)DELETE\s+FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)`,
	}

	for _, pattern := range tablePatterns {
		matches := regexp.MustCompile(pattern).FindStringSubmatch(sqlText)
		if len(matches) > 1 {
			r.Tables = append(r.Tables, matches[1])
		}
	}
}
