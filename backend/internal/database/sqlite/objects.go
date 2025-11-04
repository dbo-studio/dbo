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
	case contract.TableIndexesTab:
		return r.getTableIndexes(nodeID)

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
		WITH RECURSIVE
			src(sql) AS (
				SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?
			),
			parts(id, segment, rest) AS (
				SELECT 0,
					substr(sql, 1, CASE WHEN instr(sql, 'FOREIGN KEY') > 0 THEN instr(sql, 'FOREIGN KEY') - 1 ELSE length(sql) END),
					substr(sql, CASE WHEN instr(sql, 'FOREIGN KEY') > 0 THEN instr(sql, 'FOREIGN KEY') + 11 ELSE length(sql) END)
				FROM src
				UNION ALL
				SELECT id + 1,
					substr(rest, 1, CASE WHEN instr(rest, 'FOREIGN KEY') > 0 THEN instr(rest, 'FOREIGN KEY') - 1 ELSE length(rest) END),
					substr(rest, CASE WHEN instr(rest, 'FOREIGN KEY') > 0 THEN instr(rest, 'FOREIGN KEY') + 11 ELSE length(rest) END)
				FROM parts
				WHERE instr(rest, 'FOREIGN KEY') > 0
			),
			names AS (
				SELECT id,
					TRIM(REPLACE(REPLACE(
						CASE WHEN instr(segment, 'CONSTRAINT') > 0
							THEN substr(segment, instr(segment, 'CONSTRAINT') + 11)
							ELSE ''
						END,
						'"', ''), "'", '')) AS raw_name
				FROM parts
			),
			cleaned AS (
				SELECT id,
					CASE WHEN raw_name IS NULL OR raw_name = '' THEN NULL
					ELSE substr(raw_name, 1, CASE WHEN instr(raw_name, ' ') > 0 THEN instr(raw_name, ' ') - 1 ELSE length(raw_name) END)
					END AS constraint_name
				FROM names
			)
		SELECT
			COALESCE(cleaned.constraint_name, 'FK_' || ? || '_' || fkl."from" || '_' || fkl."table") AS constraint_name,
			fkl."from" AS ref_columns,
			fkl."table" AS target_table,
			fkl."to" AS target_columns,
			fkl.on_update AS update_action,
			fkl.on_delete AS delete_action,
			0 AS is_deferrable,
			0 AS initially_deferred
		FROM pragma_foreign_key_list(?) AS fkl
		LEFT JOIN cleaned ON cleaned.id = fkl.id
	`, node, node, node)

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

	var results []map[string]any
	err := query.Scan(&results).Error
	if err != nil {
		return nil, err
	}

	for _, f := range results {
		if (*f["not_null"].(*any)).(int64) == 1 {
			f["not_null"] = true
		} else {
			f["not_null"] = false
		}
	}

	return helper.BuildArrayResponseFromResult(results, fields)
}

func (r *SQLiteRepository) getTableInfo(node string) ([]contract.FormField, error) {
	fields := r.tableFields()

	query := r.db.Raw(`
		SELECT 
			name,
			CASE 
				WHEN sql LIKE '%TEMPORARY%' THEN 'true' 
				ELSE 'false' 
			END as temporary,
			CASE 
				WHEN sql LIKE '%STRICT%' THEN 'true' 
				ELSE 'false' 
			END as strict,
			CASE 
				WHEN sql LIKE '%WITHOUT ROWID%' THEN 'true' 
				ELSE 'false' 
			END as without_rowid
		FROM sqlite_master 
		WHERE type = 'table' AND name = ?
	`, node)

	var results []map[string]any
	err := query.Scan(&results).Error
	if err != nil {
		return nil, err
	}

	for _, f := range results {
		if (*f["temporary"].(*any)).(string) == "true" {
			f["temporary"] = true
		} else {
			f["temporary"] = false
		}

		if (*f["strict"].(*any)).(string) == "true" {
			f["strict"] = true
		} else {
			f["strict"] = false
		}

		if (*f["without_rowid"].(*any)).(string) == "true" {
			f["without_rowid"] = true
		} else {
			f["without_rowid"] = false
		}
	}

	return helper.BuildObjectResponseFromResult(results, fields)
}

func (r *SQLiteRepository) getTableKeys(node string) ([]contract.FormField, error) {
	fields := r.keyOptions(node)

	query := r.db.Raw(`
		WITH
		pk_cols AS (
			SELECT name, pk
			FROM pragma_table_info(?)
			WHERE pk > 0
			ORDER BY pk
		),
		table_sql AS (
			SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?
		),
		pk_name AS (
			SELECT CASE 
				WHEN sql LIKE '%CONSTRAINT%' AND sql LIKE '%PRIMARY KEY%'
				THEN substr(
					substr(sql, instr(sql, 'CONSTRAINT') + 11),
					1,
					CASE WHEN instr(substr(sql, instr(sql, 'CONSTRAINT') + 11), ' ') > 0
						THEN instr(substr(sql, instr(sql, 'CONSTRAINT') + 11), ' ') - 1
						ELSE length(substr(sql, instr(sql, 'CONSTRAINT') + 11))
					END
				)
				ELSE NULL
			END AS name
			FROM table_sql
		),
		u_src AS (
			SELECT sql FROM table_sql
		),
		u_parts(id, seg) AS (
			SELECT 0, substr(sql, instr(sql, 'UNIQUE') + 6) FROM u_src WHERE instr(sql, 'UNIQUE') > 0
			UNION ALL
			SELECT id + 1, substr(seg, instr(seg, 'UNIQUE') + 6) FROM u_parts WHERE instr(seg, 'UNIQUE') > 0
		),
		u_cols AS (
			SELECT id,
				TRIM(substr(seg, instr(seg, '(') + 1, instr(seg, ')') - instr(seg, '(') - 1)) AS columns
			FROM u_parts
			WHERE instr(seg, '(') > 0 AND instr(seg, ')') > instr(seg, '(')
		)
		SELECT 
			COALESCE((SELECT name FROM pk_name), 'PK_' || ?) AS name,
			(SELECT group_concat(name, ', ') FROM pk_cols) AS columns,
			'PRIMARY KEY' AS type
		UNION ALL
		SELECT 'UQ_' || ?, columns, 'UNIQUE' AS type FROM u_cols
	`, node, node, node, node)

	return helper.BuildArrayResponse(query, fields)
}

func (r *SQLiteRepository) getTableIndexes(nodeID string) ([]contract.FormField, error) {
	fields := r.indexOptions(nodeID)

	query := r.db.Raw(`
		SELECT
			il.name AS name,
			(
				SELECT GROUP_CONCAT(ii.name, ', ')
				FROM pragma_index_info(il.name) AS ii
				ORDER BY ii.seqno
			) AS columns,
			il."unique" AS "unique",
			(
				SELECT CASE
					WHEN SUM(CASE WHEN ix."desc" = 1 THEN 1 ELSE 0 END) = 0 THEN 'ASC'
					WHEN SUM(CASE WHEN ix."desc" = 1 THEN 1 ELSE 0 END) = COUNT(*) THEN 'DESC'
					ELSE NULL
				END
				FROM pragma_index_xinfo(il.name) AS ix
				WHERE ix.key = 1
			) AS "order"
		FROM pragma_index_list(?) AS il
		WHERE il.name NOT LIKE 'sqlite_%'
		GROUP BY il.name, il."unique"
	`, nodeID)

	return helper.BuildArrayResponse(query, fields)
}
