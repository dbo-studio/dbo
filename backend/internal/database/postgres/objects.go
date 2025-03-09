package databasePostgres

import (
	"fmt"

	"database/sql"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *PostgresRepository) Objects(nodeID string, objType contract.TreeNodeType, tabID contract.TreeTab) (any, error) {
	node := extractNode(nodeID)

	switch objType {
	case contract.DatabaseNodeType:
		switch tabID {
		case contract.GeneralTab:
			return r.getDatabaseInfo(node)
		case contract.PrivilegesTab:
			return r.getDatabasePrivileges(node)
		}

	case contract.SchemaNodeType:
		switch tabID {
		case contract.GeneralTab:
			return r.getSchemaInfo(node)
		case contract.PrivilegesTab:
			return r.getSchemaPrivileges(node)
		}

	case contract.TableNodeType:
		switch tabID {
		case contract.TableTab:
			return r.getTableInfo(node)
		case contract.ColumnsTab:
			return r.getTableColumns(node)
		case contract.ForeignKeysTab:
			return r.getTableForeignKeys(node)
		case contract.IndexesTab:
			return r.getTableIndexes(node)
		case contract.TriggersTab:
			return r.getTableTriggers(node)
		case contract.ChecksTab:
			return r.getTableChecks(node)
		}

	case contract.ViewNodeType:
		switch tabID {
		case contract.GeneralTab:
			return r.getViewInfo(node)
		case contract.DefinitionTab:
			return r.getViewDefinition(node)
		case contract.PrivilegesTab:
			return r.getViewPrivileges(node)
		}

	case contract.MaterializedViewNodeType:
		switch tabID {
		case contract.GeneralTab:
			return r.getMaterializedViewInfo(node)
		case contract.DefinitionTab:
			return r.getMaterializedViewDefinition(node)
		case contract.StorageTab:
			return r.getMaterializedViewStorage(node)
		case contract.PrivilegesTab:
			return r.getMaterializedViewPrivileges(node)
		}

	case contract.IndexNodeType:
		switch tabID {
		case contract.GeneralTab:
			return r.getIndexInfo(node)
		case contract.ColumnsTab:
			return r.getIndexColumns(node)
		case contract.StorageTab:
			return r.getIndexStorage(node)
		}

	case contract.SequenceNodeType:
		switch tabID {
		case contract.GeneralTab:
			return r.getSequenceInfo(node)
		case contract.DefinitionTab:
			return r.getSequenceDefinition(node)
		case contract.PrivilegesTab:
			return r.getSequencePrivileges(node)
		}
	}

	return nil, fmt.Errorf("PostgreSQL: unsupported object type: %s or tab: %s", objType, tabID)
}

func (r *PostgresRepository) getSequencePrivileges(node PGNode) (any, error) {
	type SequencePrivilege struct {
		Grantor    string         `gorm:"column:grantor"`
		Grantee    string         `gorm:"column:grantee"`
		Privileges sql.NullString `gorm:"column:privileges"`
	}

	privileges := make([]SequencePrivilege, 0)
	err := r.db.Table("information_schema.sequences AS s").
		Select("grantor, grantee, string_agg(privilege_type, ', ') as privileges").
		Joins("JOIN information_schema.usage_privileges AS p ON s.sequence_name = p.object_name").
		Where("s.sequence_schema = ? AND s.sequence_name = ?", node.Schema, node.Table).
		Group("grantor, grantee").
		Scan(&privileges).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"privileges": privileges,
	}, nil
}

func (r *PostgresRepository) getSequenceDefinition(node PGNode) (any, error) {
	type SequenceDefinition struct {
		StartValue sql.NullInt64  `gorm:"column:start_value"`
		MinValue   sql.NullInt64  `gorm:"column:min_value"`
		MaxValue   sql.NullInt64  `gorm:"column:max_value"`
		Increment  sql.NullInt64  `gorm:"column:increment"`
		Cache      sql.NullInt64  `gorm:"column:cache"`
		Comment    sql.NullString `gorm:"column:comment"`
	}

	definition := SequenceDefinition{}
	err := r.db.Table("information_schema.sequences AS s").
		Select("start_value, min_value, max_value, increment, cache, comment").
		Where("s.sequence_schema = ? AND s.sequence_name = ?", node.Schema, node.Table).
		Scan(&definition).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"definition": definition,
	}, nil
}

func (r *PostgresRepository) getSequenceInfo(node PGNode) (any, error) {
	type SequenceInfo struct {
		SequenceName  string         `gorm:"column:sequence_name"`
		SchemaName    string         `gorm:"column:schema_name"`
		DataType      string         `gorm:"column:data_type"`
		IsNullable    string         `gorm:"column:is_nullable"`
		ColumnDefault sql.NullString `gorm:"column:column_default"`
		Comment       sql.NullString `gorm:"column:comment"`
	}

	info := SequenceInfo{}
	err := r.db.Table("information_schema.sequences AS s").
		Select("sequence_name, schema_name, data_type, is_nullable, column_default, comment").
		Where("s.sequence_schema = ? AND s.sequence_name = ?", node.Schema, node.Table).
		Scan(&info).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"info": info,
	}, nil
}

func (r *PostgresRepository) getIndexStorage(node PGNode) (any, error) {
	type IndexStorage struct {
		TableSize   sql.NullString `gorm:"column:table_size"`
		IndexesSize sql.NullString `gorm:"column:indexes_size"`
		TotalSize   sql.NullString `gorm:"column:total_size"`
	}

	storage := IndexStorage{}
	err := r.db.Table("pg_class AS c").
		Select("pg_size_pretty(c.reltuples * coalesce(c.relpages, 0) * 8) as table_size, pg_size_pretty(c.relpages * 8) as indexes_size, pg_size_pretty(c.reltuples * coalesce(c.relpages, 0) * 8 + c.relpages * 8) as total_size").
		Where("c.relname = ? AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = ?)", node.Table, node.Schema).
		Scan(&storage).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"storage": storage,
	}, nil
}

func (r *PostgresRepository) getIndexColumns(node PGNode) (any, error) {
	type IndexColumn struct {
		ColumnName   string       `gorm:"column:column_name"`
		IsAscending  sql.NullBool `gorm:"column:is_ascending"`
		IsDescending sql.NullBool `gorm:"column:is_descending"`
	}

	columns := make([]IndexColumn, 0)
	err := r.db.Table("pg_index AS i").
		Select("i.indkey, c.column_name, i.is_ascending, i.is_descending").
		Joins("JOIN pg_attribute AS c ON c.attnum = ANY(i.indkey) AND c.attrelid = i.indrelid").
		Where("i.indname = ? AND i.indnamespace = (SELECT oid FROM pg_namespace WHERE nspname = ?)", node.Table, node.Schema).
		Scan(&columns).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"columns": columns,
	}, nil
}

func (r *PostgresRepository) getIndexInfo(node PGNode) (any, error) {
	type IndexInfo struct {
		IndexName   string         `gorm:"column:index_name"`
		SchemaName  string         `gorm:"column:schema_name"`
		TableSize   sql.NullString `gorm:"column:table_size"`
		IndexesSize sql.NullString `gorm:"column:indexes_size"`
		TotalSize   sql.NullString `gorm:"column:total_size"`
	}

	info := IndexInfo{}
	err := r.db.Table("pg_index AS i").
		Select("i.indname, n.nspname, pg_size_pretty(c.reltuples * coalesce(c.relpages, 0) * 8) as table_size, pg_size_pretty(c.relpages * 8) as indexes_size, pg_size_pretty(c.reltuples * coalesce(c.relpages, 0) * 8 + c.relpages * 8) as total_size").
		Joins("JOIN pg_class AS c ON c.relname = ? AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = ?)", node.Table, node.Schema).
		Scan(&info).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"info": info,
	}, nil
}

func (r *PostgresRepository) getMaterializedViewPrivileges(node PGNode) (any, error) {
	type MaterializedViewPrivilege struct {
		Grantor    string         `gorm:"column:grantor"`
		Grantee    string         `gorm:"column:grantee"`
		Privileges sql.NullString `gorm:"column:privileges"`
	}

	privileges := make([]MaterializedViewPrivilege, 0)
	err := r.db.Table("information_schema.sequences AS s").
		Select("grantor, grantee, string_agg(privilege_type, ', ') as privileges").
		Joins("JOIN information_schema.usage_privileges AS p ON s.sequence_name = p.object_name").
		Where("s.sequence_schema = ? AND s.sequence_name = ?", node.Schema, node.Table).
		Group("grantor, grantee").
		Scan(&privileges).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"privileges": privileges,
	}, nil
}

func (r *PostgresRepository) getMaterializedViewStorage(node PGNode) (any, error) {
	type MaterializedViewStorage struct {
		TableSize   sql.NullString `gorm:"column:table_size"`
		IndexesSize sql.NullString `gorm:"column:indexes_size"`
		TotalSize   sql.NullString `gorm:"column:total_size"`
	}

	storage := MaterializedViewStorage{}
	err := r.db.Table("pg_class AS c").
		Select("pg_size_pretty(c.reltuples * coalesce(c.relpages, 0) * 8) as table_size, pg_size_pretty(c.relpages * 8) as indexes_size, pg_size_pretty(c.reltuples * coalesce(c.relpages, 0) * 8 + c.relpages * 8) as total_size").
		Where("c.relname = ? AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = ?)", node.Table, node.Schema).
		Scan(&storage).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"storage": storage,
	}, nil
}

func (r *PostgresRepository) getMaterializedViewDefinition(node PGNode) (any, error) {
	type MaterializedViewDefinition struct {
		Definition sql.NullString `gorm:"column:definition"`
	}

	definition := MaterializedViewDefinition{}
	err := r.db.Table("pg_matviews AS m").
		Select("m.definition").
		Where("m.matviewname = ? AND m.schemaname = ?", node.Table, node.Schema).
		Scan(&definition).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"definition": definition,
	}, nil
}

func (r *PostgresRepository) getMaterializedViewInfo(node PGNode) (any, error) {
	type MaterializedViewInfo struct {
		ViewName    string         `gorm:"column:view_name"`
		SchemaName  string         `gorm:"column:schema_name"`
		TableSize   sql.NullString `gorm:"column:table_size"`
		IndexesSize sql.NullString `gorm:"column:indexes_size"`
		TotalSize   sql.NullString `gorm:"column:total_size"`
	}

	info := MaterializedViewInfo{}
	err := r.db.Table("pg_class AS c").
		Select("c.relname as view_name, n.nspname as schema_name, pg_size_pretty(c.reltuples * coalesce(c.relpages, 0) * 8) as table_size, pg_size_pretty(c.relpages * 8) as indexes_size, pg_size_pretty(c.reltuples * coalesce(c.relpages, 0) * 8 + c.relpages * 8) as total_size").
		Joins("JOIN pg_namespace AS n ON n.oid = c.relnamespace").
		Where("c.relname = ? AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = ?)", node.Table, node.Schema).
		Scan(&info).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"info": info,
	}, nil
}

func (r *PostgresRepository) getViewPrivileges(node PGNode) (any, error) {
	type ViewPrivilege struct {
		Grantor    string         `gorm:"column:grantor"`
		Grantee    string         `gorm:"column:grantee"`
		Privileges sql.NullString `gorm:"column:privileges"`
	}

	privileges := make([]ViewPrivilege, 0)
	err := r.db.Table("information_schema.sequences AS s").
		Select("grantor, grantee, string_agg(privilege_type, ', ') as privileges").
		Joins("JOIN information_schema.usage_privileges AS p ON s.sequence_name = p.object_name").
		Where("s.sequence_schema = ? AND s.sequence_name = ?", node.Schema, node.Table).
		Group("grantor, grantee").
		Scan(&privileges).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"privileges": privileges,
	}, nil
}

func (r *PostgresRepository) getViewDefinition(node PGNode) (any, error) {
	type ViewDefinition struct {
		Definition sql.NullString `gorm:"column:definition"`
	}

	definition := ViewDefinition{}
	err := r.db.Table("pg_views AS v").
		Select("v.definition").
		Where("v.viewname = ? AND v.schemaname = ?", node.Table, node.Schema).
		Scan(&definition).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"definition": definition,
	}, nil
}

func (r *PostgresRepository) getViewInfo(node PGNode) (any, error) {
	type ViewInfo struct {
		ViewName    string         `gorm:"column:view_name"`
		SchemaName  string         `gorm:"column:schema_name"`
		TableSize   sql.NullString `gorm:"column:table_size"`
		IndexesSize sql.NullString `gorm:"column:indexes_size"`
		TotalSize   sql.NullString `gorm:"column:total_size"`
	}

	info := ViewInfo{}
	err := r.db.Table("pg_class AS c").
		Select("c.relname as view_name, n.nspname as schema_name, pg_size_pretty(c.reltuples * coalesce(c.relpages, 0) * 8) as table_size, pg_size_pretty(c.relpages * 8) as indexes_size, pg_size_pretty(c.reltuples * coalesce(c.relpages, 0) * 8 + c.relpages * 8) as total_size").
		Joins("JOIN pg_namespace AS n ON n.oid = c.relnamespace").
		Where("c.relname = ? AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = ?)", node.Table, node.Schema).
		Scan(&info).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"info": info,
	}, nil
}

func (r *PostgresRepository) getTableChecks(node PGNode) (any, error) {
	type TableCheck struct {
		CheckName  string         `gorm:"column:check_name"`
		SchemaName string         `gorm:"column:schema_name"`
		Definition sql.NullString `gorm:"column:definition"`
	}

	checks := make([]TableCheck, 0)
	err := r.db.Table("pg_constraint AS c").
		Select("c.conname as check_name, n.nspname as schema_name, c.consrc as definition").
		Joins("JOIN pg_namespace AS n ON n.oid = c.connamespace").
		Where("c.conname = ? AND c.connamespace = (SELECT oid FROM pg_namespace WHERE nspname = ?)", node.Table, node.Schema).
		Scan(&checks).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"checks": checks,
	}, nil
}

func (r *PostgresRepository) getTableTriggers(node PGNode) (any, error) {
	type TableTrigger struct {
		TriggerName string `gorm:"column:trigger_name"`
		SchemaName  string `gorm:"column:schema_name"`
		TriggerType string `gorm:"column:trigger_type"`
		Event       string `gorm:"column:event"`
		Table       string `gorm:"column:table"`
		Function    string `gorm:"column:function"`
	}

	triggers := make([]TableTrigger, 0)
	err := r.db.Table("pg_trigger AS t").
		Select("t.tgname as trigger_name, n.nspname as schema_name, t.tgtype as trigger_type, t.tgevent as event, c.relname as table, f.proname as function").
		Joins("JOIN pg_class AS c ON c.relname = ? AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = ?)", node.Table, node.Schema).
		Joins("JOIN pg_proc AS f ON f.oid = t.tgfoid").
		Scan(&triggers).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"triggers": triggers,
	}, nil
}

func (r *PostgresRepository) getTableIndexes(node PGNode) (any, error) {
	type TableIndex struct {
		IndexName   string         `gorm:"column:index_name"`
		SchemaName  string         `gorm:"column:schema_name"`
		TableSize   sql.NullString `gorm:"column:table_size"`
		IndexesSize sql.NullString `gorm:"column:indexes_size"`
		TotalSize   sql.NullString `gorm:"column:total_size"`
	}

	indexes := make([]TableIndex, 0)
	err := r.db.Table("pg_index AS i").
		Select("i.indname as index_name, n.nspname as schema_name, pg_size_pretty(c.reltuples * coalesce(c.relpages, 0) * 8) as table_size, pg_size_pretty(c.relpages * 8) as indexes_size, pg_size_pretty(c.reltuples * coalesce(c.relpages, 0) * 8 + c.relpages * 8) as total_size").
		Joins("JOIN pg_class AS c ON c.relname = ? AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = ?)", node.Table, node.Schema).
		Scan(&indexes).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"indexes": indexes,
	}, nil
}

func (r *PostgresRepository) getTableForeignKeys(node PGNode) (any, error) {
	type TableForeignKey struct {
		ConstraintName string         `gorm:"column:constraint_name"`
		SchemaName     string         `gorm:"column:schema_name"`
		Definition     sql.NullString `gorm:"column:definition"`
	}

	foreignKeys := make([]TableForeignKey, 0)
	err := r.db.Table("pg_constraint AS c").
		Select("c.conname as constraint_name, n.nspname as schema_name, c.consrc as definition").
		Joins("JOIN pg_namespace AS n ON n.oid = c.connamespace").
		Where("c.conname = ? AND c.connamespace = (SELECT oid FROM pg_namespace WHERE nspname = ?)", node.Table, node.Schema).
		Scan(&foreignKeys).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"foreignKeys": foreignKeys,
	}, nil
}

func (r *PostgresRepository) getTableColumns(node PGNode) (any, error) {
	type TableColumn struct {
		ColumnName    string         `gorm:"column:column_name"`
		DataType      string         `gorm:"column:data_type"`
		IsNullable    string         `gorm:"column:is_nullable"`
		ColumnDefault sql.NullString `gorm:"column:column_default"`
		Comment       sql.NullString `gorm:"column:comment"`
	}

	columns := make([]TableColumn, 0)
	err := r.db.Table("pg_attribute AS a").
		Select("a.attname as column_name, t.typname as data_type, a.attnotnull as is_nullable, pg_get_expr(ad.adbin, ad.adrelid) as column_default, d.description as comment").
		Joins("JOIN pg_type AS t ON t.oid = a.atttypid").
		Joins("JOIN pg_class AS c ON c.relname = ? AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = ?)", node.Table, node.Schema).
		Joins("LEFT JOIN pg_attrdef AS ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum").
		Joins("LEFT JOIN pg_description AS d ON d.objoid = a.attrelid AND d.objsubid = a.attnum").
		Where("a.attrelid = c.oid AND a.attnum > 0").
		Scan(&columns).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"columns": columns,
	}, nil
}

func (r *PostgresRepository) getSchemaPrivileges(node PGNode) (any, error) {
	type SchemaPrivilege struct {
		Grantor    string         `gorm:"column:grantor"`
		Grantee    string         `gorm:"column:grantee"`
		Privileges sql.NullString `gorm:"column:privileges"`
	}

	privileges := make([]SchemaPrivilege, 0)
	err := r.db.Table("pg_namespace AS n").
		Select("grantor, grantee, string_agg(privilege_type, ', ') as privileges").
		Joins("JOIN information_schema.usage_privileges AS p ON n.nspname = p.object_name").
		Where("n.nspname = ?", node.Schema).
		Scan(&privileges).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"privileges": privileges,
	}, nil
}

func (r *PostgresRepository) getSchemaInfo(node PGNode) (any, error) {
	type SchemaInfo struct {
		SchemaName string         `gorm:"column:schema_name"`
		Owner      string         `gorm:"column:owner"`
		Comment    sql.NullString `gorm:"column:comment"`
	}

	info := SchemaInfo{}
	err := r.db.Table("pg_namespace AS n").
		Select("n.nspname as schema_name, r.rolname as owner, d.description as comment").
		Joins("JOIN pg_roles AS r ON r.oid = n.nspowner").
		Joins("LEFT JOIN pg_description AS d ON d.objoid = n.oid AND d.objsubid = 0").
		Where("n.nspname = ?", node.Schema).
		Scan(&info).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"info": info,
	}, nil
}

func (r *PostgresRepository) getDatabasePrivileges(node PGNode) (any, error) {
	type DatabasePrivilege struct {
		Grantor    string         `gorm:"column:grantor"`
		Grantee    string         `gorm:"column:grantee"`
		Privileges sql.NullString `gorm:"column:privileges"`
	}

	privileges := make([]DatabasePrivilege, 0)
	err := r.db.Table("pg_database AS d").
		Select("grantor, grantee, string_agg(privilege_type, ', ') as privileges").
		Joins("JOIN information_schema.usage_privileges AS p ON d.datname = p.object_name").
		Where("d.datname = ?", node.Database).
		Scan(&privileges).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"privileges": privileges,
	}, nil
}

func (r *PostgresRepository) getDatabaseInfo(node PGNode) (any, error) {
	var info struct {
		Name     string         `gorm:"column:datname"`
		Owner    string         `gorm:"column:rolname"`
		Encoding sql.NullString `gorm:"column:encoding"`
	}
	err := r.db.Raw(`
		SELECT d.datname, r.rolname, pg_encoding_to_char(encoding) as encoding
		FROM pg_database d
		JOIN pg_roles r ON r.oid = d.datdba
		WHERE d.datname = ?`, node.Database).Scan(&info).Error
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"name":     info.Name,
		"owner":    info.Owner,
		"encoding": info.Encoding.String,
	}, nil
}

// Helper methods for Table
func (r *PostgresRepository) getTableInfo(node PGNode) (any, error) {
	var info struct {
		Name                string         `gorm:"column:name"`
		Comment             sql.NullString `gorm:"column:description"`
		Persistence         string         `gorm:"column:persistence"`
		WithOids            bool           `gorm:"column:with_oids"`
		PartitionExpression sql.NullString `gorm:"column:partition_expression"`
		PartitionKey        sql.NullString `gorm:"column:partition_key"`
		Options             sql.NullString `gorm:"column:options"`
		AccessMethod        sql.NullString `gorm:"column:access_method"`
		Tablespace          sql.NullString `gorm:"column:tablespace"`
		Owner               string         `gorm:"column:owner"`
	}
	err := r.db.Raw(`
		SELECT 
			CASE WHEN c.relpersistence = 't' THEN true ELSE false END AS istemporary,
			d.description
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		LEFT JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = 0
		WHERE c.relname = ? AND n.nspname = ?`,
		node.Table, node.Schema).Scan(&info).Error
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"name":                 node.Table,
		"persistence":          info.Persistence,
		"with_oids":            info.WithOids,
		"partition_expression": info.PartitionExpression.String,
		"partition_key":        info.PartitionKey.String,
		"options":              info.Options.String,
		"access_method":        info.AccessMethod.String,
		"tablespace":           info.Tablespace.String,
		"owner":                info.Owner,
	}, nil
}
