package databasePostgres

import (
	"context"
	"fmt"
	"slices"
	"strconv"
	"strings"
	"time"

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
	databases := make([]Database, 0)
	cacheKey := r.cacheKey("databases")

	if fromCache {
		err := r.cache.Get(ctx, cacheKey, &databases)
		if err != nil {
			return nil, err
		}

		if len(databases) > 0 {
			return databases, nil
		}
	}

	err := r.db.WithContext(ctx).Table("pg_database d").
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
		First(&databases).Error

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
	schemas := make([]Schema, 0)
	cacheKey := r.cacheKey("schemas", lo.FromPtr(database))

	if fromCache {
		err := r.cache.Get(ctx, cacheKey, &schemas)
		if err != nil {
			return nil, err
		}

		if len(schemas) > 0 {
			return schemas, nil
		}
	}

	query := r.db.WithContext(ctx).Table("pg_namespace n").
		Select(`
		n.nspname AS nspname,
		r.rolname AS rolname,
		d.description AS description
	`).
		Joins("LEFT JOIN pg_roles r ON r.oid = n.nspowner").
		Joins("LEFT JOIN pg_description d ON d.objoid = n.oid AND d.classoid = 'pg_namespace'::regclass").
		Where("n.nspname NOT IN ('pg_catalog', 'information_schema')")

	err := query.
		Order("n.nspname").
		Find(&schemas).Error

	// query := r.db.WithContext(ctx).Select("schema_name").
	// 	Table("information_schema.schemata").
	// 	Where("schema_name NOT IN ('pg_catalog', 'information_schema')")

	// if database != nil {
	// 	query = query.Where("catalog_name = ?", lo.FromPtr(database))
	// }

	// err := query.
	// 	Order("schema_name").
	// 	Find(&schemas).Error

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

func (r *PostgresRepository) tables(ctx context.Context, schema *string, fromCache bool) ([]Table, error) {
	tables := make([]Table, 0)
	cacheKey := r.cacheKey("tables", lo.FromPtr(schema))

	if fromCache {
		err := r.cache.Get(ctx, cacheKey, &tables)
		if err != nil {
			return nil, err
		}

		if len(tables) > 0 {
			return tables, nil
		}
	}

	query := r.db.WithContext(ctx).Table("pg_class c").
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
		Where("c.relkind = 'r'")

	if schema != nil {
		query = query.Where("n.nspname = ?", lo.FromPtr(schema))
	}

	err := query.Order("c.relname").Find(&tables).Error
	if err != nil {
		return nil, err
	}

	r.updateCache(ctx, cacheKey, tables)

	return tables, nil
}

type View struct {
	Name        string  `gorm:"column:table_name"`
	Comment     *string `gorm:"column:comment"`
	CheckOption *string `gorm:"column:check_option"`
	Query       *string `gorm:"column:query"`
}

func (r *PostgresRepository) views(ctx context.Context, database *string, schema *string, fromCache bool) ([]View, error) {
	views := make([]View, 0)
	cacheKey := r.cacheKey("views", lo.FromPtr(database), lo.FromPtr(schema))

	if fromCache {
		err := r.cache.Get(ctx, cacheKey, &views)
		if err != nil {
			return nil, err
		}

		if len(views) > 0 {
			return views, nil
		}
	}

	query := r.db.WithContext(ctx).Table("pg_class c").
		Select(`
			c.relname as table_name,
			d.description as comment,
			NULL as check_option,
			pg_get_viewdef(c.oid, true) as query
		`).
		Joins("JOIN pg_namespace n ON n.oid = c.relnamespace").
		Joins("LEFT JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = 0").
		Where("c.relkind = 'v'").
		Where("n.nspname NOT IN ('pg_catalog', 'information_schema')")

	if schema != nil {
		query = query.Where("n.nspname = ?", lo.FromPtr(schema))
	}

	err := query.Order("c.relname").Find(&views).Error
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

func (r *PostgresRepository) materializedViews(ctx context.Context, schema *string, fromCache bool) ([]MaterializedView, error) {
	mvs := make([]MaterializedView, 0)
	cacheKey := r.cacheKey("materialized_views", lo.FromPtr(schema))

	if fromCache {
		err := r.cache.Get(ctx, cacheKey, &mvs)
		if err != nil {
			return nil, err
		}

		if len(mvs) > 0 {
			return mvs, nil
		}
	}

	query := r.db.WithContext(ctx).Table("pg_class AS c").
		Select("c.relname as name, d.description as comment, t.spcname as tablespace, r.rolname as rolname, m.definition as query").
		Joins("JOIN pg_namespace AS n ON n.oid = c.relnamespace").
		Joins("LEFT JOIN pg_description AS d ON d.objoid = c.oid AND d.objsubid = 0").
		Joins("LEFT JOIN pg_tablespace AS t ON t.oid = c.reltablespace").
		Joins("LEFT JOIN pg_roles r ON r.oid = c.relowner").
		Joins("LEFT JOIN pg_matviews AS m ON m.matviewname = c.relname AND m.schemaname = n.nspname").
		Where("c.relkind = 'm'")

	if schema != nil {
		query = query.Where("n.nspname = ?", lo.FromPtr(schema))
	}

	err := query.Order("c.relname").Find(&mvs).Error
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
	IsNullable             string  `gorm:"column:is_nullable"`
	ColumnDefault          *string `gorm:"column:column_default"`
	CharacterMaximumLength *int32  `gorm:"column:character_maximum_length"`
	Comment                *string `gorm:"column:column_comment"`
	NumericScale           *int32  `gorm:"column:numeric_scale"`
	IsIdentity             bool    `gorm:"column:is_identity"`
	IsGenerated            bool    `gorm:"column:is_generated"`

	MappedType string      `gorm:"-"`
	Editable   bool        `gorm:"-"`
	IsActive   bool        `gorm:"-"`
	PrimaryKey *PrimaryKey `gorm:"-"`
	ForeignKey *ForeignKey `gorm:"-"`
}

func (r *PostgresRepository) columns(ctx context.Context, table *string, schema *string, columnNames []string, editable bool, fromCache bool) ([]Column, error) {
	columns := make([]Column, 0)
	cacheKey := r.cacheKey("columns", lo.FromPtr(table), lo.FromPtr(schema), strings.Join(columnNames, ","), strconv.FormatBool(editable))

	if fromCache {
		err := r.cache.Get(ctx, cacheKey, &columns)
		if err != nil {
			return nil, err
		}

		if len(columns) > 0 {
			return columns, nil
		}
	}

	query := r.db.WithContext(ctx).Table("pg_attribute AS a").
		Select(`
			a.attnum AS ordinal_position,
			a.attname AS column_name,
			format_type(a.atttypid, NULL) as data_type,
			CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable,
			COALESCE(pg_get_expr(ad.adbin, ad.adrelid), col.column_default) AS column_default,
			col.character_maximum_length,
			col.numeric_scale,
			d.description AS column_comment,
			CASE WHEN a.attidentity != '' THEN true ELSE false END AS is_identity,
			CASE WHEN a.attgenerated != '' THEN true ELSE false END AS is_generated
		`).
		Joins("JOIN pg_class AS c ON c.oid = a.attrelid").
		Joins("JOIN pg_namespace AS n ON n.oid = c.relnamespace").
		Joins("LEFT JOIN pg_attrdef AS ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum").
		Joins("LEFT JOIN pg_description AS d ON d.objoid = a.attrelid AND d.objsubid = a.attnum").
		Joins(`LEFT JOIN information_schema.columns AS col ON 
			col.table_schema = n.nspname AND
			col.table_name = c.relname AND
			col.column_name = a.attname`).
		Where("a.attnum > 0").
		Where("NOT a.attisdropped")

	if table != nil {
		query = query.Where("c.relname = ?", lo.FromPtr(table))
	}

	if schema != nil {
		query = query.Where("n.nspname = ?", lo.FromPtr(schema))
	}

	g, gctx := errgroup.WithContext(ctx)
	var pkList []PrimaryKey
	var fkList []ForeignKey

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
		list, err := r.primaryKeys(gctx, table, fromCache)
		if err != nil {
			return err
		}
		pkList = list
		return nil
	})

	g.Go(func() error {
		list, err := r.foreignKeys(gctx, table, schema, fromCache)
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
		columns[i].MappedType = columnMappedFormat(column.DataType)
		columns[i].Editable = editable
		columns[i].IsActive = true
		if len(columnNames) > 0 {
			columns[i].IsActive = slices.Contains(columnNames, column.ColumnName)
		}

		primary, pkFound := lo.Find(pkList, func(pk PrimaryKey) bool {
			return pk.ColumnName == column.ColumnName
		})

		foreignKey, fkFound := lo.Find(fkList, func(fk ForeignKey) bool {
			return slices.Contains(fk.ColumnsList, column.ColumnName)
		})

		if pkFound {
			columns[i].PrimaryKey = &primary
		}

		if fkFound {
			columns[i].ForeignKey = &foreignKey
		}
	}

	r.updateCache(ctx, cacheKey, columns)

	return columns, nil
}

type Template struct {
	Name string `gorm:"column:datname"`
}

func (r *PostgresRepository) templates(ctx context.Context, fromCache bool) ([]Template, error) {
	templates := make([]Template, 0)
	cacheKey := r.cacheKey("templates")

	if fromCache {
		err := r.cache.Get(ctx, cacheKey, &templates)
		if err != nil {
			return nil, err
		}

		if len(templates) > 0 {
			return templates, nil
		}
	}

	err := r.db.WithContext(ctx).Table("pg_database").
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

func (r *PostgresRepository) primaryKeys(ctx context.Context, table *string, fromCache bool) ([]PrimaryKey, error) {
	primaryKeys := make([]PrimaryKey, 0)
	cacheKey := r.cacheKey("primary_keys", lo.FromPtr(table))

	if fromCache {
		err := r.cache.Get(ctx, cacheKey, &primaryKeys)
		if err != nil {
			return nil, err
		}

		if len(primaryKeys) > 0 {
			return primaryKeys, nil
		}
	}

	query := r.db.WithContext(ctx).Table("information_schema.table_constraints AS tc").
		Select("kcu.column_name").
		Joins("JOIN information_schema.key_column_usage AS kcu ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema").
		Where("tc.constraint_type = 'PRIMARY KEY'")

	if table != nil {
		query = query.Where("tc.table_name = ?", lo.FromPtr(table))
	}

	err := query.Order("kcu.column_name").Find(&primaryKeys).Error
	if err != nil {
		return nil, err
	}

	r.updateCache(ctx, cacheKey, primaryKeys)

	return primaryKeys, nil
}

type ForeignKey struct {
	ConstraintName    string  `gorm:"column:constraint_name"`
	Columns           string  `gorm:"column:columns"`
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

func (r *PostgresRepository) foreignKeys(ctx context.Context, table *string, schema *string, fromCache bool) ([]ForeignKey, error) {
	foreignKeys := make([]ForeignKey, 0)
	cacheKey := r.cacheKey("foreign_keys", lo.FromPtr(table), lo.FromPtr(schema))

	if fromCache {
		err := r.cache.Get(ctx, cacheKey, &foreignKeys)
		if err != nil {
			return nil, err
		}

		if len(foreignKeys) > 0 {
			return foreignKeys, nil
		}
	}

	query := r.db.WithContext(ctx).Table("pg_constraint c").
		Select(`
			c.conname as constraint_name,
			array_to_string(array_agg(a.attname ORDER BY array_position(c.conkey, a.attnum)), ', ') as columns,
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

	err := query.
		Order("c.conname").
		Group("c.conname, ct.relname, c.confupdtype, c.confdeltype, c.condeferrable, c.condeferred, d.description, c.conkey, c.confkey").
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

func (r *PostgresRepository) tableKeys(ctx context.Context, table *string, schema *string, fromCache bool) ([]TableKey, error) {
	keys := make([]TableKey, 0)
	cacheKey := r.cacheKey("keys", lo.FromPtr(table), lo.FromPtr(schema))

	if fromCache {
		err := r.cache.Get(ctx, cacheKey, &keys)
		if err != nil {
			return nil, err
		}

		if len(keys) > 0 {
			return keys, nil
		}
	}

	query := r.db.WithContext(ctx).Table("pg_constraint c").
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

	err := query.
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
	tablespaces := make([]Tablespace, 0)
	cacheKey := r.cacheKey("tablespaces")

	if fromCache {
		err := r.cache.Get(ctx, cacheKey, &tablespaces)
		if err != nil {
			return nil, err
		}

		if len(tablespaces) > 0 {
			return tablespaces, nil
		}
	}

	err := r.db.WithContext(ctx).Table("pg_tablespace").
		Select("spcname").
		Order("spcname").
		Find(&tablespaces).Error

	if err != nil {
		return nil, err
	}

	r.updateCache(ctx, cacheKey, tablespaces)

	return tablespaces, nil
}

func (r *PostgresRepository) cacheKey(args ...string) string {
	return fmt.Sprintf("c:%d:query_generator:%s", r.connection.ID, strings.Join(args, "_"))
}

func (r *PostgresRepository) updateCache(ctx context.Context, cacheKey string, value any) {
	// Use background context to avoid context cancellation issues in goroutine
	go func() {
		bgCtx := context.Background()
		err := r.cache.Set(bgCtx, cacheKey, value, lo.ToPtr(time.Hour))
		if err != nil {
			r.logger.Error(err)
		}
	}()
}
