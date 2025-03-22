package databasePostgres

import (
	"fmt"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *PostgresRepository) Objects(nodeID string, tabID contract.TreeTab, action contract.TreeNodeActionName) ([]contract.FormField, error) {
	node := extractNode(nodeID)

	switch tabID {

	case contract.DatabaseTab:
		return r.getDatabaseInfo(node)

	case contract.SchemaTab:
		return r.getSchemaInfo(node)

	case contract.TableTab:
		return r.getTableInfo(node, action)
	case contract.TableColumnsTab:
		return r.getTableColumns(node)
	case contract.TableForeignKeysTab:
		return r.getTableForeignKeys(node)
	case contract.TableIndexesTab:
		return r.getTableIndexes(node)
	case contract.TableTriggersTab:
		return r.getTableTriggers(node)
	case contract.TableChecksTab:
		return r.getTableChecks(node)
	case contract.TableKeysTab:
		return r.getTableKeys(node)
	case contract.TableSequenceTab:
		return r.getTableSequence(node)

	case contract.ViewTab:
		return r.getViewInfo(node)

	case contract.MaterializedViewTab:
		return r.getMaterializedViewInfo(node)
	}

	return nil, fmt.Errorf("PostgreSQL: unsupported object or tab: %s", tabID)
}

func (r *PostgresRepository) getTableSequence(node PGNode) ([]contract.FormField, error) {
	fields := r.sequenceFields()
	query := r.db.Table("information_schema.sequences AS s").
		Select(`
			s.sequence_name AS name,
			obj_description(c.oid, 'pg_class') AS comment,
			s.increment AS increment,
			s.minimum_value AS min_value,
			s.maximum_value AS max_value,
			s.start_value AS start_value,
			s.cache_value AS cache,
			s.cycle_option AS cycle,
			CONCAT(s.sequence_schema, '.', s.sequence_name) AS owned_by
		`).
		Joins("JOIN pg_class c ON c.relname = s.sequence_name").
		Joins("JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = s.sequence_schema").
		Where("s.sequence_schema = ? AND s.sequence_name = ?", node.Schema, node.Table)

	return buildObjectResponse(query, fields)
}

func (r *PostgresRepository) getMaterializedViewInfo(node PGNode) ([]contract.FormField, error) {
	fields := r.materializedViewFields()

	query := r.db.Table("pg_class AS c").
		Select(`
			c.relname as name,
			d.description as comment,
			NULL as withs,
			t.spcname as tablespace,
			m.definition as query
		`).
		Joins("JOIN pg_namespace AS n ON n.oid = c.relnamespace").
		Joins("LEFT JOIN pg_description AS d ON d.objoid = c.oid AND d.objsubid = 0").
		Joins("LEFT JOIN pg_tablespace AS t ON t.oid = c.reltablespace").
		Joins("LEFT JOIN pg_matviews AS m ON m.matviewname = c.relname AND m.schemaname = n.nspname").
		Where("c.relname = ? AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = ?)", node.Table, node.Schema)

	return buildObjectResponse(query, fields)
}

func (r *PostgresRepository) getViewInfo(node PGNode) ([]contract.FormField, error) {
	fields := r.viewFields()

	query := r.db.Table("pg_class AS c").
		Select(`
			c.relname as name,
			d.description as comment,
			v.definition as query,
			NULL as check_option
		`).
		Joins("JOIN pg_namespace AQAqqawWS3``11		q	`e4	`sw3	wasS n ON n.oid = c.relnamespace").
		Joins("LEFT JOIN pg_views v ON v.viewname = c.relname AND v.schemaname = n.nspname").
		Joins("LEFT JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = 0").
		Where("c.relname = ? AND n.nspname = ? AND c.relkind = 'v'", node.Table, node.Schema)

	return buildObjectResponse(query, fields)
}

func (r *PostgresRepository) getTableChecks(node PGNode) ([]contract.FormField, error) {
	fields := r.checkOptions()

	query := r.db.Table("pg_constraint AS c").
		Select(`
			c.conname as name,
			d.description as comment,
			c.condeferrable as deferrable,
			c.condeferred as initially_deferred,
			c.connoinherit as no_inherit,
			pg_get_constraintdef(c.oid) as predicate
		`).
		Joins("JOIN pg_namespace AS n ON n.oid = c.connamespace").
		Joins("LEFT JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = 0").
		Where("c.conrelid = (SELECT oid FROM pg_class WHERE relname = ? AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = ?)) AND c.contype = 'c'", node.Table, node.Schema)

	return buildArrayResponse(query, fields)
}

func (r *PostgresRepository) getTableTriggers(node PGNode) ([]contract.FormField, error) {
	fields := r.triggerOptions(node)

	query := r.db.Table("pg_trigger AS t").
		Select(`
			t.tgname as name,
			d.description as comment,
			CASE 
				WHEN (t.tgtype & 2) = 2 THEN 'BEFORE'
				WHEN (t.tgtype & 16) = 16 THEN 'INSTEAD OF'
				ELSE 'AFTER'
			END as timing,
			CASE 
				WHEN (t.tgtype & 1) = 1 THEN 'FOR EACH ROW'
				ELSE 'FOR EACH STATEMENT'
			END as level,
			array_to_string(ARRAY[
				CASE WHEN (t.tgtype & 4) = 4 THEN 'INSERT' ELSE NULL END,
				CASE WHEN (t.tgtype & 8) = 8 THEN 'DELETE' ELSE NULL END,
				CASE WHEN (t.tgtype & 32) = 32 THEN 'UPDATE' ELSE NULL END,
				CASE WHEN (t.tgtype & 64) = 64 THEN 'TRUNCATE' ELSE NULL END
			], ', ') as events,
			array_to_string(array_agg(a.attname), ', ') as update_columns,
			p.proname as function,
			pg_get_triggerdef(t.oid) as when,
			(t.tgtype & 128) = 128 as no_inherit,
			NOT t.tgisinternal as enable,
			(t.tgtype & 256) = 256 as truncate_cascade
		`).
		Joins("JOIN pg_class AS c ON c.oid = t.tgrelid").
		Joins("JOIN pg_namespace AS n ON n.oid = c.relnamespace").
		Joins("JOIN pg_proc AS p ON p.oid = t.tgfoid").
		Joins("LEFT JOIN pg_description AS d ON d.objoid = t.oid AND d.objsubid = 0").
		Joins("LEFT JOIN pg_attribute AS a ON a.attrelid = t.tgrelid AND a.attnum = ANY(t.tgattr)").
		Where("c.relname = ? AND n.nspname = ?", node.Table, node.Schema).
		Group("t.tgname, d.description, t.tgtype, p.proname, t.oid")

	return buildArrayResponse(query, fields)
}

func (r *PostgresRepository) getTableIndexes(node PGNode) ([]contract.FormField, error) {
	fields := r.indexOptions(node)
	query := r.db.Table("pg_index ix").
		Select(`
			i.relname as index_name,
			array_to_string(array_agg(a.attname), ', ') as columns,
			ix.indisunique as is_unique,
			ix.indisprimary as is_primary,
			am.amname as access_method,
			t.spcname as tablespace,
			pg_get_indexdef(i.oid) as definition,
			pg_size_pretty(pg_relation_size(i.oid)) as size
		`).
		Joins("JOIN pg_class i ON i.oid = ix.indexrelid").
		Joins("JOIN pg_class c ON c.oid = ix.indrelid").
		Joins("JOIN pg_namespace n ON n.oid = c.relnamespace").
		Joins("JOIN pg_am am ON am.oid = i.relam").
		Joins("LEFT JOIN pg_tablespace t ON t.oid = i.reltablespace").
		Joins("JOIN pg_attribute a ON a.attrelid = ix.indrelid AND a.attnum = ANY(ix.indkey)").
		Where("n.nspname = ? AND c.relname = ?", node.Schema, node.Table).
		Group("i.relname, ix.indisunique, ix.indisprimary, am.amname, t.spcname, i.oid")

	return buildArrayResponse(query, fields)
}

func (r *PostgresRepository) getTableForeignKeys(node PGNode) ([]contract.FormField, error) {
	fields := r.foreignKeyOptions(node)

	query := r.db.Table("pg_constraint c").
		Select(`
			c.conname as constraint_name,
			array_to_string(array_agg(a.attname ORDER BY array_position(c.conkey, a.attnum)), ', ') as columns,
			ct.relname as ref_table,
			array_to_string(array_agg(af.attname ORDER BY array_position(c.confkey, af.attnum)), ', ') as ref_columns,
			CASE c.confupdtype
				WHEN 'a' THEN 'NO ACTION'
				WHEN 'r' THEN 'RESTRICT'
				WHEN 'c' THEN 'CASCADE'
				WHEN 'n' THEN 'SET NULL'
				WHEN 'd' THEN 'SET DEFAULT'
			END as update_action,
			CASE c.confdeltype
				WHEN 'a' THEN 'NO ACTION'
				WHEN 'r' THEN 'RESTRICT'
				WHEN 'c' THEN 'CASCADE'
				WHEN 'n' THEN 'SET NULL'
				WHEN 'd' THEN 'SET DEFAULT'
			END as delete_action,
			c.condeferrable as is_deferrable,
			c.condeferred as initially_deferred,
			d.description as comment
		`).
		Joins("JOIN pg_class t ON t.oid = c.conrelid").
		Joins("JOIN pg_class ct ON ct.oid = c.confrelid").
		Joins("JOIN pg_namespace n ON n.oid = t.relnamespace").
		Joins("JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)").
		Joins("JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = ANY(c.confkey)").
		Joins("LEFT JOIN pg_description d ON d.objoid = c.oid").
		Where("n.nspname = ? AND t.relname = ? AND c.contype = 'f'", node.Schema, node.Table).
		Group("c.conname, ct.relname, c.confupdtype, c.confdeltype, c.condeferrable, c.condeferred, d.description, c.conkey, c.confkey")

	return buildArrayResponse(query, fields)
}

func (r *PostgresRepository) getTableColumns(node PGNode) ([]contract.FormField, error) {
	fields := r.tableColumnFields()

	query := r.db.Table("pg_attribute a").
		Select(`
			a.attname as column_name,
			format_type(a.atttypid, a.atttypmod) as data_type,
			a.attnotnull as not_null,
			pg_get_expr(ad.adbin, ad.adrelid) as column_default,
			col.character_maximum_length,
			col.numeric_scale,
			CASE WHEN a.attidentity != '' THEN true ELSE false END as is_identity,
			CASE WHEN a.attgenerated != '' THEN true ELSE false END as is_generated,
			d.description as comment
		`).
		Joins("JOIN pg_class c ON c.oid = a.attrelid").
		Joins("JOIN pg_namespace n ON n.oid = c.relnamespace").
		Joins("LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum").
		Joins("LEFT JOIN pg_description d ON d.objoid = a.attrelid AND d.objsubid = a.attnum").
		Joins(`LEFT JOIN information_schema.columns col ON 
			col.table_schema = n.nspname AND 
			col.table_name = c.relname AND 
			col.column_name = a.attname`).
		Where("n.nspname = ? AND c.relname = ? AND a.attnum > 0 AND NOT a.attisdropped", node.Schema, node.Table).
		Order("a.attnum")

	return buildArrayResponse(query, fields)
}

func (r *PostgresRepository) getSchemaInfo(node PGNode) ([]contract.FormField, error) {
	fields := r.schemaFields()

	query := r.db.Table("pg_namespace n").
		Select(`
			n.nspname,
			r.rolname,
			d.description
		`).
		Joins("JOIN pg_roles r ON r.oid = n.nspowner").
		Joins("LEFT JOIN pg_description d ON d.objoid = n.oid AND d.objsubid = 0").
		Where("n.nspname = ?", node.Schema)

	return buildObjectResponse(query, fields)
}

func (r *PostgresRepository) getDatabaseInfo(node PGNode) ([]contract.FormField, error) {
	fields := r.databaseFields()

	query := r.db.Table("pg_database d").
		Select(`
			d.datname,
			r.rolname,
			pg_encoding_to_char(d.encoding) as encoding,
			des.description,
			t.spcname as tablespace
		`).
		Joins("JOIN pg_roles r ON r.oid = d.datdba").
		Joins("LEFT JOIN pg_shdescription des ON des.objoid = d.oid").
		Joins("LEFT JOIN pg_tablespace t ON t.oid = d.dattablespace").
		Where("d.datname = ?", node.Database)

	return buildObjectResponse(query, fields)
}

func (r *PostgresRepository) getTableInfo(node PGNode, action contract.TreeNodeActionName) ([]contract.FormField, error) {
	fields := r.tableFields(action)

	query := r.db.Table("pg_class c").
		Select(`
			c.relname,
			pd.description,
			CASE c.relpersistence
				WHEN 'p' THEN 'LOGGED'
				WHEN 'u' THEN 'UNLOGGED'
				WHEN 't' THEN 'TEMPORARY'
			END as persistence,
			t.spcname as tablespace,
			r.rolname
		`).
		Joins("JOIN pg_namespace n ON n.oid = c.relnamespace").
		Joins("LEFT JOIN pg_roles r ON r.oid = c.relowner").
		Joins("LEFT JOIN pg_tablespace t ON t.oid = c.reltablespace").
		Joins("LEFT JOIN pg_description pd ON pd.objoid = c.oid AND pd.objsubid = 0").
		Where("c.relname = ? AND n.nspname = ?", node.Table, node.Schema)

	return buildObjectResponse(query, fields)
}

func (r *PostgresRepository) getTableKeys(node PGNode) ([]contract.FormField, error) {
	fields := r.getKeyOptions(node)

	query := r.db.Table("pg_constraint c").
		Select(`
			c.conname as name,
			d.description as comment,
			(c.contype = 'p') as primary,
			c.condeferrable as deferrable,
			c.condeferred as initially_deferred,
			array_to_string(array_agg(a.attname), ', ') as columns,
			pg_get_constraintdef(c.oid) as exclude_operator
		`).
		Joins("JOIN pg_namespace n ON n.oid = c.connamespace").
		Joins("LEFT JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = 0").
		Joins("LEFT JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)").
		Where("c.conrelid = (SELECT oid FROM pg_class WHERE relname = ? AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = ?)) AND c.contype = 'p'", node.Table, node.Schema).
		Group("c.conname, d.description, c.contype, c.condeferrable, c.condeferred, c.oid")

	return buildArrayResponse(query, fields)
}
