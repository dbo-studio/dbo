package databaseSqlite

import (
	"fmt"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/helper"
)

func (r *SQLiteRepository) Objects(nodeID string, tabID contract.TreeTab, _ contract.TreeNodeActionName) ([]contract.FormField, error) {
	switch tabID {

	case contract.TableTab:
		return r.getTableInfo(nodeID)
	case contract.TableColumnsTab:
		return r.getTableColumns(nodeID)
	case contract.TableForeignKeysTab:
		return r.getTableForeignKeys(nodeID)
	case contract.TableKeysTab:
		return r.getTableKeys(nodeID)

	case contract.ViewTab:
		return r.getViewInfo(nodeID)
	}

	return nil, fmt.Errorf("SQLite: unsupported object or tab: %s", tabID)
}

func (r *SQLiteRepository) getViewInfo(node string) ([]contract.FormField, error) {
	fields := r.viewFields()

	query := r.db.Table("sqlite_master").
		Select(`
			name,
			NULL as comment,
			sql as query,
			NULL as check_option
		`).
		Where("type = 'view' AND name = ?", node)

	return helper.BuildObjectResponse(query, fields)
}

func (r *SQLiteRepository) getTableForeignKeys(node string) ([]contract.FormField, error) {
	fields := r.foreignKeyOptions(node)

	query := r.db.Raw(`
		SELECT 
			id as constraint_name,
			'from' as columns,
			'table' as target_table,
			'to' as ref_columns,
			'on_update' as update_action,
			'on_delete' as delete_action
		FROM pragma_foreign_key_list(?)
	`, node)

	return helper.BuildArrayResponse(query, fields)
}

func (r *SQLiteRepository) getTableColumns(node string) ([]contract.FormField, error) {
	fields := r.tableColumnFields()

	query := r.db.Raw(`
		SELECT 
			pti.name,
			pti.type,
			pti."notnull" as not_null,
			pti.dflt_value,
			pti.pk,
			CASE 
				WHEN sm.sql LIKE '%GENERATED ALWAYS AS%' AND sm.sql LIKE '%STORED%' THEN 'GENERATED_STORED'
				WHEN sm.sql LIKE '%GENERATED ALWAYS AS%' THEN 'GENERATED_VIRTUAL'
				ELSE 'NORMAL'
			END as column_kind,
			CASE 
				WHEN sm.sql LIKE '%COLLATE ROLLBACK%' THEN 'ROLLBACK'
				WHEN sm.sql LIKE '%COLLATE NOCASE%' THEN 'NOCASE'
				WHEN sm.sql LIKE '%COLLATE RTRIM%' THEN 'RTRIM'
				ELSE NULL
			END as collection_name,
			CASE 
				WHEN sm.sql LIKE '%ON CONFLICT ROLLBACK%' THEN 'ROLLBACK'
				WHEN sm.sql LIKE '%ON CONFLICT ABORT%' THEN 'ABORT'
				WHEN sm.sql LIKE '%ON CONFLICT FAIL%' THEN 'FAIL'
				WHEN sm.sql LIKE '%ON CONFLICT IGNORE%' THEN 'IGNORE'
				WHEN sm.sql LIKE '%ON CONFLICT REPLACE%' THEN 'REPLACE'
				ELSE NULL
			END as on_null_conflicts
		FROM pragma_table_info(?) pti
		JOIN sqlite_master sm ON sm.name = ? AND sm.type = 'table'
	`, node, node)

	return helper.BuildArrayResponse(query, fields)
}

func (r *SQLiteRepository) getTableInfo(node string) ([]contract.FormField, error) {
	fields := r.tableFields()

	query := r.db.Raw(`
		SELECT 
			name,
			CASE 
				WHEN sql LIKE '%TEMPORARY%' THEN 1 
				ELSE 0 
			END as temporary,
			CASE 
				WHEN sql LIKE '%STRICT%' THEN 1 
				ELSE 0 
			END as strict,
			CASE 
				WHEN sql LIKE '%WITHOUT ROWID%' THEN 1 
				ELSE 0 
			END as without_rowid
		FROM sqlite_master 
		WHERE type = 'table' AND name = ?
	`, node)

	return helper.BuildObjectResponse(query, fields)
}

func (r *SQLiteRepository) getTableKeys(node string) ([]contract.FormField, error) {
	fields := r.keyOptions(node)

	query := r.db.Raw(`
		SELECT 
			name,
			'PRIMARY' as type
		FROM pragma_table_info(?)
		WHERE pk > 0
	`, node)

	return helper.BuildArrayResponse(query, fields)
}
