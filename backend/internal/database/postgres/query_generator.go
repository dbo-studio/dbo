package databasePostgres

import (
	"context"
	"slices"
	"strconv"
	"strings"
	"time"

	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/samber/lo"
	"golang.org/x/sync/errgroup"
)

type Database struct {
	Name        string  `gorm:"column:datname"`
	Owner       string  `gorm:"column:rolname"`
	Template    string  `gorm:"column:template"`
	Description *string `gorm:"column:description"`
	Tablespace  *string `gorm:"column:tablespace"`
}

func (r *PostgresRepository) databases(ctx context.Context, fromCache bool) ([]Database, error) {
	var databases []Database

	cacheKey := cache.PostgresQueryKey(r.base.Connection().ID, "databases")

	if fromCache {
		err := r.base.Cache().Get(ctx, cacheKey, &databases)
		if err != nil {
			return nil, err
		}

		if databases != nil {
			return databases, nil
		}
	}

	err := r.base.DB().WithContext(ctx).Table("pg_database d").
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
		Find(&databases).Error
	if err != nil {
		return nil, err
	}

	r.updateCache(ctx, cacheKey, databases)

	return databases, nil
}

type Schema struct {
	Name    string  `gorm:"column:nspname"`
	Owner   string  `gorm:"column:rolname"`
	Comment *string `gorm:"column:description"`
}

func (r *PostgresRepository) schemas(ctx context.Context, database *string, fromCache bool) ([]Schema, error) {
	var schemas []Schema

	cacheKey := cache.PostgresQueryKey(r.base.Connection().ID, "schemas", lo.FromPtr(database))

	if fromCache {
		err := r.base.Cache().Get(ctx, cacheKey, &schemas)
		if err != nil {
			return nil, err
		}

		if schemas != nil {
			return schemas, nil
		}
	}

	conn, err := r.db(ctx, database)
	if err != nil {
		return nil, err
	}

	query := conn.WithContext(ctx).Table("pg_namespace n").
		Select(`
		n.nspname AS nspname,
		r.rolname AS rolname,
		d.description AS description
	`).
		Joins("LEFT JOIN pg_roles r ON r.oid = n.nspowner").
		Joins("LEFT JOIN pg_description d ON d.objoid = n.oid AND d.classoid = 'pg_namespace'::regclass").
		Where("n.nspname NOT IN ('pg_catalog', 'information_schema')").
		Where("n.nspname NOT LIKE 'pg_toast%'").
		Where("n.nspname NOT LIKE 'pg_temp%'")

	err = query.
		Order("n.nspname").
		Find(&schemas).Error
	if err != nil {
		return nil, err
	}

	r.updateCache(ctx, cacheKey, schemas)

	return schemas, nil
}

type Table struct {
	Name        string  `gorm:"column:relname"`
	Description *string `gorm:"column:description"`
	Persistence string  `gorm:"column:persistence"`
	TableSpace  string  `gorm:"column:tablespace"`
	Owner       string  `gorm:"column:rolname"`
}

func (r *PostgresRepository) tables(ctx context.Context, database *string, schema *string, fromCache bool) ([]Table, error) {
	var tables []Table

	cacheKey := cache.PostgresQueryKey(r.base.Connection().ID, "tables", lo.FromPtr(database), lo.FromPtr(schema))

	if fromCache {
		err := r.base.Cache().Get(ctx, cacheKey, &tables)
		if err != nil {
			return nil, err
		}

		if tables != nil {
			return tables, nil
		}
	}

	conn, err := r.db(ctx, database)
	if err != nil {
		return nil, err
	}

	query := conn.WithContext(ctx).Table("pg_class c").
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
		Where("c.relkind = 'r'").
		Where("n.nspname NOT IN ('pg_catalog', 'information_schema')").
		Where("n.nspname NOT LIKE 'pg_toast%'").
		Where("n.nspname NOT LIKE 'pg_temp%'")

	if schema != nil {
		query = query.Where("n.nspname = ?", lo.FromPtr(schema))
	}

	err = query.Order("c.relname").Find(&tables).Error
	if err != nil {
		return nil, err
	}

	r.updateCache(ctx, cacheKey, tables)

	return tables, nil
}

func (r *PostgresRepository) tableByName(ctx context.Context, database *string, schema *string, name string) (*Table, error) {
	conn, err := r.db(ctx, database)
	if err != nil {
		return nil, err
	}

	var table Table

	query := conn.WithContext(ctx).Table("pg_class c").
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
		Where("c.relkind = 'r'").
		Where("c.relname = ?", name).
		Where("n.nspname NOT IN ('pg_catalog', 'information_schema')").
		Where("n.nspname NOT LIKE 'pg_toast%'").
		Where("n.nspname NOT LIKE 'pg_temp%'")

	if schema != nil {
		query = query.Where("n.nspname = ?", lo.FromPtr(schema))
	}

	err = query.Limit(1).Find(&table).Error
	if err != nil {
		return nil, err
	}

	if table.Name == "" {
		return nil, nil
	}

	return &table, nil
}

type View struct {
	Name        string  `gorm:"column:table_name"`
	Comment     *string `gorm:"column:comment"`
	CheckOption *string `gorm:"column:check_option"`
	Query       *string `gorm:"column:query"`
}

func (r *PostgresRepository) views(ctx context.Context, database *string, schema *string, fromCache bool) ([]View, error) {
	var views []View

	cacheKey := cache.PostgresQueryKey(r.base.Connection().ID, "views", lo.FromPtr(database), lo.FromPtr(schema))

	if fromCache {
		err := r.base.Cache().Get(ctx, cacheKey, &views)
		if err != nil {
			return nil, err
		}

		if views != nil {
			return views, nil
		}
	}

	conn, err := r.db(ctx, database)
	if err != nil {
		return nil, err
	}

	query := conn.WithContext(ctx).Table("pg_class c").
		Select(`
			c.relname as table_name,
			d.description as comment,
			NULL as check_option,
			pg_get_viewdef(c.oid, true) as query
		`).
		Joins("JOIN pg_namespace n ON n.oid = c.relnamespace").
		Joins("LEFT JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = 0").
		Where("c.relkind = 'v'").
		Where("n.nspname NOT IN ('pg_catalog', 'information_schema')").
		Where("n.nspname NOT LIKE 'pg_toast%'").
		Where("n.nspname NOT LIKE 'pg_temp%'")

	if schema != nil {
		query = query.Where("n.nspname = ?", lo.FromPtr(schema))
	}

	err = query.Order("c.relname").Find(&views).Error
	if err != nil {
		return nil, err
	}

	r.updateCache(ctx, cacheKey, views)

	return views, nil
}

func (r *PostgresRepository) viewsLite(ctx context.Context, database *string, schema *string, fromCache bool) ([]View, error) {
	var views []View

	cacheKey := cache.PostgresQueryKey(r.base.Connection().ID, "views_lite", lo.FromPtr(database), lo.FromPtr(schema))

	if fromCache {
		err := r.base.Cache().Get(ctx, cacheKey, &views)
		if err != nil {
			return nil, err
		}

		if views != nil {
			return views, nil
		}
	}

	conn, err := r.db(ctx, database)
	if err != nil {
		return nil, err
	}

	query := conn.WithContext(ctx).Table("pg_class c").
		Select(`
			c.relname as table_name,
			d.description as comment,
			NULL as check_option,
			NULL as query
		`).
		Joins("JOIN pg_namespace n ON n.oid = c.relnamespace").
		Joins("LEFT JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = 0").
		Where("c.relkind = 'v'").
		Where("n.nspname NOT IN ('pg_catalog', 'information_schema')").
		Where("n.nspname NOT LIKE 'pg_toast%'").
		Where("n.nspname NOT LIKE 'pg_temp%'")

	if schema != nil {
		query = query.Where("n.nspname = ?", lo.FromPtr(schema))
	}

	err = query.Order("c.relname").Find(&views).Error
	if err != nil {
		return nil, err
	}

	r.updateCache(ctx, cacheKey, views)

	return views, nil
}

type MaterializedView struct {
	Name       string  `gorm:"column:matviewname"`
	Comment    *string `gorm:"column:comment"`
	Tablespace *string `gorm:"column:tablespace"`
	Owner      *string `gorm:"column:rolname"`
	Query      *string `gorm:"column:query"`
}

func (r *PostgresRepository) materializedViews(ctx context.Context, database *string, schema *string, fromCache bool) ([]MaterializedView, error) {
	var mvs []MaterializedView

	cacheKey := cache.PostgresQueryKey(r.base.Connection().ID, "materialized_views", lo.FromPtr(database), lo.FromPtr(schema))

	if fromCache {
		err := r.base.Cache().Get(ctx, cacheKey, &mvs)
		if err != nil {
			return nil, err
		}

		if mvs != nil {
			return mvs, nil
		}
	}

	conn, err := r.db(ctx, database)
	if err != nil {
		return nil, err
	}

	query := conn.WithContext(ctx).Table("pg_class AS c").
		Select("c.relname as matviewname, d.description as comment, t.spcname as tablespace, r.rolname as rolname, m.definition as query").
		Joins("JOIN pg_namespace AS n ON n.oid = c.relnamespace").
		Joins("LEFT JOIN pg_description AS d ON d.objoid = c.oid AND d.objsubid = 0").
		Joins("LEFT JOIN pg_tablespace AS t ON t.oid = c.reltablespace").
		Joins("LEFT JOIN pg_roles r ON r.oid = c.relowner").
		Joins("LEFT JOIN pg_matviews AS m ON m.matviewname = c.relname AND m.schemaname = n.nspname").
		Where("c.relkind = 'm'").
		Where("n.nspname NOT IN ('pg_catalog', 'information_schema')").
		Where("n.nspname NOT LIKE 'pg_toast%'").
		Where("n.nspname NOT LIKE 'pg_temp%'")

	if schema != nil {
		query = query.Where("n.nspname = ?", lo.FromPtr(schema))
	}

	err = query.Order("c.relname").Find(&mvs).Error
	if err != nil {
		return nil, err
	}

	r.updateCache(ctx, cacheKey, mvs)

	return mvs, nil
}

type Column struct {
	OrdinalPosition        int32   `gorm:"column:ordinal_position"`
	ColumnName             string  `gorm:"column:column_name"`
	DataType               string  `gorm:"column:data_type"`
	TypeOID                uint32  `gorm:"column:type_oid"`
	TypeType               string  `gorm:"column:type_type"`
	IsNullable             string  `gorm:"column:is_nullable"`
	ColumnDefault          *string `gorm:"column:column_default"`
	CharacterMaximumLength *int64  `gorm:"column:character_maximum_length"`
	Comment                *string `gorm:"column:column_comment"`
	NumericScale           *int32  `gorm:"column:numeric_scale"`
	IsIdentity             bool    `gorm:"column:is_identity"`
	IsGenerated            bool    `gorm:"column:is_generated"`

	MappedType   string      `gorm:"-"`
	Editable     bool        `gorm:"-"`
	IsActive     bool        `gorm:"-"`
	IsPrimaryKey bool        `gorm:"-"`
	IsForeignKey bool        `gorm:"-"`
	EnumValues   []string    `gorm:"-"`
	ForeignKey   *ForeignKey `gorm:"-"`
}

func (r *PostgresRepository) columns(ctx context.Context, database *string, table *string, schema *string, columnNames []string, editable bool, fromCache bool) ([]Column, error) {
	var columns []Column

	cacheKey := cache.PostgresQueryKey(r.base.Connection().ID, "columns", lo.FromPtr(database), lo.FromPtr(table), lo.FromPtr(schema), strings.Join(columnNames, ","), strconv.FormatBool(editable))

	if fromCache {
		err := r.base.Cache().Get(ctx, cacheKey, &columns)
		if err != nil {
			return nil, err
		}

		if columns != nil {
			return columns, nil
		}
	}

	conn, err := r.db(ctx, database)
	if err != nil {
		return nil, err
	}

	query := conn.WithContext(ctx).Table("pg_attribute AS a").
		Select(`
			a.attnum AS ordinal_position,
			a.attname AS column_name,
			format_type(a.atttypid, a.atttypmod) as data_type,
			a.atttypid AS type_oid,
			t.typtype AS type_type,
			CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable,
			pg_get_expr(ad.adbin, ad.adrelid) AS column_default,
			CASE
				WHEN a.atttypid IN (1042, 1043) AND a.atttypmod > 0 THEN (a.atttypmod - 4)::bigint
				WHEN a.atttypid = 1560 AND a.atttypmod > 0 THEN a.atttypmod::bigint
				ELSE NULL
			END AS character_maximum_length,
			CASE
				WHEN a.atttypid = 1700 AND a.atttypmod > -1 THEN ((a.atttypmod - 4) & 65535)::int
				ELSE NULL
			END AS numeric_scale,
			d.description AS column_comment,
			CASE WHEN a.attidentity != '' THEN true ELSE false END AS is_identity,
			CASE WHEN a.attgenerated != '' THEN true ELSE false END AS is_generated
		`).
		Joins("JOIN pg_class AS c ON c.oid = a.attrelid").
		Joins("JOIN pg_namespace AS n ON n.oid = c.relnamespace").
		Joins("JOIN pg_type AS t ON t.oid = a.atttypid").
		Joins("LEFT JOIN pg_attrdef AS ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum").
		Joins("LEFT JOIN pg_description AS d ON d.objoid = a.attrelid AND d.objsubid = a.attnum").
		Where("a.attnum > 0").
		Where("NOT a.attisdropped")

	if table != nil {
		query = query.Where("c.relname = ?", lo.FromPtr(table))
	}

	if schema != nil {
		query = query.Where("n.nspname = ?", lo.FromPtr(schema))
	}

	g, gctx := errgroup.WithContext(ctx)
	g.SetLimit(6)

	var (
		pkList []PrimaryKey
		fkList []ForeignKey
	)

	g.Go(func() error {
		err := query.WithContext(gctx).
			Order("a.attnum").
			Find(&columns).Error
		if err != nil {
			return err
		}

		return nil
	})

	g.Go(func() error {
		list, err := r.primaryKeys(gctx, database, table, schema, fromCache)
		if err != nil {
			return err
		}

		pkList = list

		return nil
	})

	g.Go(func() error {
		list, err := r.foreignKeys(gctx, database, table, schema, fromCache)
		if err != nil {
			return err
		}

		fkList = list

		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	for i, column := range columns {
		columns[i].MappedType = r.base.ColumnMappedFormat(column.DataType)
		columns[i].Editable = editable

		columns[i].IsActive = true
		if len(columnNames) > 0 {
			columns[i].IsActive = slices.Contains(columnNames, column.ColumnName)
		}

		_, pkFound := lo.Find(pkList, func(pk PrimaryKey) bool {
			return pk.ColumnName == column.ColumnName
		})

		foreignKey, fkFound := lo.Find(fkList, func(fk ForeignKey) bool {
			return slices.Contains(fk.ColumnsList, column.ColumnName)
		})

		if pkFound {
			columns[i].IsPrimaryKey = true
		}

		if fkFound {
			columns[i].ForeignKey = &foreignKey
			columns[i].IsForeignKey = true
		}
	}

	if err := r.attachEnumValues(ctx, database, columns); err != nil {
		return nil, err
	}

	r.updateCache(ctx, cacheKey, columns)

	return columns, nil
}

func (r *PostgresRepository) attachEnumValues(ctx context.Context, database *string, columns []Column) error {
	typeOIDs := make([]uint32, 0)
	seen := make(map[uint32]struct{})

	for _, column := range columns {
		if column.TypeType != "e" {
			continue
		}

		if _, ok := seen[column.TypeOID]; ok {
			continue
		}

		seen[column.TypeOID] = struct{}{}
		typeOIDs = append(typeOIDs, column.TypeOID)
	}

	if len(typeOIDs) == 0 {
		return nil
	}

	conn, err := r.db(ctx, database)
	if err != nil {
		return err
	}

	type enumLabelRow struct {
		TypeOID uint32 `gorm:"column:enumtypid"`
		Label   string `gorm:"column:enumlabel"`
	}

	var rows []enumLabelRow

	err = conn.WithContext(ctx).
		Table("pg_enum").
		Select("enumtypid, enumlabel").
		Where("enumtypid IN ?", typeOIDs).
		Order("enumtypid, enumsortorder").
		Find(&rows).Error
	if err != nil {
		return err
	}

	labelsByOID := make(map[uint32][]string, len(typeOIDs))
	for _, row := range rows {
		labelsByOID[row.TypeOID] = append(labelsByOID[row.TypeOID], row.Label)
	}

	for i, column := range columns {
		if column.TypeType != "e" {
			continue
		}

		if labels, ok := labelsByOID[column.TypeOID]; ok && len(labels) > 0 {
			columns[i].MappedType = databaseCore.MappedTypeEnum
			columns[i].EnumValues = labels
		}
	}

	return nil
}

// columnsLite returns column names only — no PK/FK enrichment and no information_schema join.
func (r *PostgresRepository) columnsLite(ctx context.Context, database *string, table *string, schema *string, fromCache bool) ([]string, error) {
	var names []string

	cacheKey := cache.PostgresQueryKey(r.base.Connection().ID, "columns_lite", lo.FromPtr(database), lo.FromPtr(table), lo.FromPtr(schema))

	if fromCache {
		err := r.base.Cache().Get(ctx, cacheKey, &names)
		if err != nil {
			return nil, err
		}

		if names != nil {
			return names, nil
		}
	}

	names = make([]string, 0)

	conn, err := r.db(ctx, database)
	if err != nil {
		return nil, err
	}

	type columnNameRow struct {
		ColumnName string `gorm:"column:column_name"`
	}

	rows := make([]columnNameRow, 0)
	query := conn.WithContext(ctx).Table("pg_attribute AS a").
		Select("a.attname AS column_name").
		Joins("JOIN pg_class AS c ON c.oid = a.attrelid").
		Joins("JOIN pg_namespace AS n ON n.oid = c.relnamespace").
		Where("a.attnum > 0").
		Where("NOT a.attisdropped")

	if table != nil {
		query = query.Where("c.relname = ?", lo.FromPtr(table))
	}

	if schema != nil {
		query = query.Where("n.nspname = ?", lo.FromPtr(schema))
	}

	err = query.Order("a.attnum").Find(&rows).Error
	if err != nil {
		return nil, err
	}

	names = lo.Map(rows, func(row columnNameRow, _ int) string { return row.ColumnName })
	r.updateCache(ctx, cacheKey, names)

	return names, nil
}

// columnsLiteBatch returns column names for all tables in a schema (or all user schemas) in one query.
func (r *PostgresRepository) columnsLiteBatch(ctx context.Context, database *string, schema *string) (map[string][]string, error) {
	conn, err := r.db(ctx, database)
	if err != nil {
		return nil, err
	}

	type columnNameRow struct {
		TableName  string `gorm:"column:table_name"`
		ColumnName string `gorm:"column:column_name"`
	}

	rows := make([]columnNameRow, 0)
	query := conn.WithContext(ctx).Table("pg_attribute AS a").
		Select("c.relname AS table_name, a.attname AS column_name").
		Joins("JOIN pg_class AS c ON c.oid = a.attrelid").
		Joins("JOIN pg_namespace AS n ON n.oid = c.relnamespace").
		Where("c.relkind = 'r'").
		Where("a.attnum > 0").
		Where("NOT a.attisdropped").
		Where("n.nspname NOT IN ('pg_catalog', 'information_schema')").
		Where("n.nspname NOT LIKE 'pg_toast%'").
		Where("n.nspname NOT LIKE 'pg_temp%'")

	if schema != nil {
		query = query.Where("n.nspname = ?", lo.FromPtr(schema))
	}

	err = query.Order("c.relname, a.attnum").Find(&rows).Error
	if err != nil {
		return nil, err
	}

	out := make(map[string][]string)
	for _, row := range rows {
		out[row.TableName] = append(out[row.TableName], row.ColumnName)
	}

	return out, nil
}

type Template struct {
	Name string `gorm:"column:datname"`
}

func (r *PostgresRepository) templates(ctx context.Context, fromCache bool) ([]Template, error) {
	var templates []Template

	cacheKey := cache.PostgresQueryKey(r.base.Connection().ID, "templates")

	if fromCache {
		err := r.base.Cache().Get(ctx, cacheKey, &templates)
		if err != nil {
			return nil, err
		}

		if templates != nil {
			return templates, nil
		}
	}

	err := r.base.DB().WithContext(ctx).Table("pg_database").
		Select("datname").
		Where("datistemplate = true").
		Order("datname").
		Find(&templates).Error
	if err != nil {
		return nil, err
	}

	r.updateCache(ctx, cacheKey, templates)

	return templates, nil
}

type PrimaryKey struct {
	ColumnName string `gorm:"column:column_name"`
}

func (r *PostgresRepository) primaryKeys(ctx context.Context, database *string, table *string, schema *string, fromCache bool) ([]PrimaryKey, error) {
	var primaryKeys []PrimaryKey

	cacheKey := cache.PostgresQueryKey(r.base.Connection().ID, "primary_keys", lo.FromPtr(database), lo.FromPtr(table), lo.FromPtr(schema))

	if fromCache {
		err := r.base.Cache().Get(ctx, cacheKey, &primaryKeys)
		if err != nil {
			return nil, err
		}

		if primaryKeys != nil {
			return primaryKeys, nil
		}
	}

	conn, err := r.db(ctx, database)
	if err != nil {
		return nil, err
	}

	query := conn.WithContext(ctx).Table("pg_index AS i").
		Select("a.attname AS column_name").
		Joins("JOIN pg_class AS c ON c.oid = i.indrelid").
		Joins("JOIN pg_namespace AS n ON n.oid = c.relnamespace").
		Joins("JOIN pg_attribute AS a ON a.attrelid = c.oid AND a.attnum = ANY (i.indkey)").
		Where("i.indisprimary = true").
		Where("a.attnum > 0").
		Where("NOT a.attisdropped")

	if table != nil {
		query = query.Where("c.relname = ?", lo.FromPtr(table))
	}

	if schema != nil {
		query = query.Where("n.nspname = ?", lo.FromPtr(schema))
	} else {
		query = query.Where("n.nspname NOT IN ('pg_catalog', 'information_schema')")
	}

	err = query.Order("a.attnum").Find(&primaryKeys).Error
	if err != nil {
		return nil, err
	}

	r.updateCache(ctx, cacheKey, primaryKeys)

	return primaryKeys, nil
}

type ForeignKey struct {
	ConstraintName    string  `gorm:"column:constraint_name"`
	Columns           string  `gorm:"column:columns"`
	TargetSchema      string  `gorm:"column:target_schema"`
	TargetTable       string  `gorm:"column:target_table"`
	RefColumns        string  `gorm:"column:ref_columns"`
	UpdateAction      string  `gorm:"column:update_action"`
	DeleteAction      string  `gorm:"column:delete_action"`
	IsDeferrable      bool    `gorm:"column:is_deferrable"`
	InitiallyDeferred bool    `gorm:"column:initially_deferred"`
	Comment           *string `gorm:"column:comment"`

	ColumnsList    []string `gorm:"-"`
	RefColumnsList []string `gorm:"-"`
}

func (r *PostgresRepository) foreignKeys(ctx context.Context, database *string, table *string, schema *string, fromCache bool) ([]ForeignKey, error) {
	var foreignKeys []ForeignKey

	cacheKey := cache.PostgresQueryKey(r.base.Connection().ID, "foreign_keys", lo.FromPtr(database), lo.FromPtr(table), lo.FromPtr(schema))

	if fromCache {
		err := r.base.Cache().Get(ctx, cacheKey, &foreignKeys)
		if err != nil {
			return nil, err
		}

		if foreignKeys != nil {
			return foreignKeys, nil
		}
	}

	conn, err := r.db(ctx, database)
	if err != nil {
		return nil, err
	}

	query := conn.WithContext(ctx).Table("pg_constraint c").
		Select(`
			c.conname as constraint_name,
			array_to_string(array_agg(a.attname ORDER BY array_position(c.conkey, a.attnum)), ', ') as columns,
			nt.nspname as target_schema,
			ct.relname as target_table,
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
		Joins("JOIN pg_namespace nt ON nt.oid = ct.relnamespace").
		Joins("JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)").
		Joins("JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = ANY(c.confkey)").
		Joins("LEFT JOIN pg_description d ON d.objoid = c.oid").
		Where("c.contype = 'f'")

	if table != nil {
		query = query.Where("t.relname = ?", lo.FromPtr(table))
	}

	if schema != nil {
		query = query.Where("n.nspname = ?", lo.FromPtr(schema))
	}

	err = query.
		Order("c.conname").
		Group("c.conname, nt.nspname, ct.relname, c.confupdtype, c.confdeltype, c.condeferrable, c.condeferred, d.description, c.conkey, c.confkey").
		Find(&foreignKeys).Error
	if err != nil {
		return nil, err
	}

	for i := range foreignKeys {
		cols := strings.Split(foreignKeys[i].Columns, ",")

		foreignKeys[i].ColumnsList = make([]string, len(cols))
		for j, col := range cols {
			foreignKeys[i].ColumnsList[j] = strings.TrimSpace(col)
		}

		refCols := strings.Split(foreignKeys[i].RefColumns, ",")

		foreignKeys[i].RefColumnsList = make([]string, len(refCols))
		for j, col := range refCols {
			foreignKeys[i].RefColumnsList[j] = strings.TrimSpace(col)
		}
	}

	r.updateCache(ctx, cacheKey, foreignKeys)

	return foreignKeys, nil
}

type TableKey struct {
	Name              string  `gorm:"column:name"`
	Comment           *string `gorm:"column:comment"`
	Primary           bool    `gorm:"column:primary"`
	Deferrable        bool    `gorm:"column:deferrable"`
	InitiallyDeferred bool    `gorm:"column:initially_deferred"`
	Columns           string  `gorm:"column:columns"`
	ExcludeOperator   string  `gorm:"column:exclude_operator"`

	ColumnsList []string `gorm:"-"`
}

func (r *PostgresRepository) tableKeys(ctx context.Context, database *string, table *string, schema *string, fromCache bool) ([]TableKey, error) {
	keys := make([]TableKey, 0)
	cacheKey := cache.PostgresQueryKey(r.base.Connection().ID, "keys", lo.FromPtr(database), lo.FromPtr(table), lo.FromPtr(schema))

	if fromCache {
		err := r.base.Cache().Get(ctx, cacheKey, &keys)
		if err != nil {
			return nil, err
		}

		if len(keys) > 0 {
			return keys, nil
		}
	}

	conn, err := r.db(ctx, database)
	if err != nil {
		return nil, err
	}

	query := conn.WithContext(ctx).Table("pg_constraint c").
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
		Joins("LEFT JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)")

	if table != nil {
		query = query.Where("c.conrelid = (SELECT oid FROM pg_class WHERE relname = ? AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = ?))", lo.FromPtr(table), lo.FromPtr(schema))
	}

	if schema != nil {
		query = query.Where("n.nspname = ?", lo.FromPtr(schema))
	}

	err = query.
		Group("c.conname, d.description, c.contype, c.condeferrable, c.condeferred, c.oid").
		Find(&keys).Error
	if err != nil {
		return nil, err
	}

	for i := range keys {
		cols := strings.Split(keys[i].Columns, ",")

		keys[i].ColumnsList = make([]string, len(cols))
		for j, col := range cols {
			keys[i].ColumnsList[j] = strings.TrimSpace(col)
		}
	}

	r.updateCache(ctx, cacheKey, keys)

	return keys, nil
}

type Tablespace struct {
	Name string `gorm:"column:spcname"`
}

func (r *PostgresRepository) tablespaces(ctx context.Context, fromCache bool) ([]Tablespace, error) {
	var tablespaces []Tablespace

	cacheKey := cache.PostgresQueryKey(r.base.Connection().ID, "tablespaces")

	if fromCache {
		err := r.base.Cache().Get(ctx, cacheKey, &tablespaces)
		if err != nil {
			return nil, err
		}

		if tablespaces != nil {
			return tablespaces, nil
		}
	}

	err := r.base.DB().WithContext(ctx).Table("pg_tablespace").
		Select("spcname").
		Order("spcname").
		Find(&tablespaces).Error
	if err != nil {
		return nil, err
	}

	r.updateCache(ctx, cacheKey, tablespaces)

	return tablespaces, nil
}

func (r *PostgresRepository) updateCache(ctx context.Context, cacheKey string, value any) {
	bgCtx := context.WithoutCancel(ctx)

	go func() {
		err := r.base.Cache().Set(bgCtx, cacheKey, value, lo.ToPtr(time.Hour))
		if err != nil {
			r.base.Logger().Error(err)
		}
	}()
}
