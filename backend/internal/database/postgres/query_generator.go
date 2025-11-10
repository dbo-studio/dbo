package databasePostgres

import (
	"context"
	"fmt"
	"slices"
	"strconv"
	"strings"

	"github.com/samber/lo"
	"golang.org/x/sync/errgroup"
)

type Database struct {
	Name string `gorm:"column:datname"`
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

	err := r.db.WithContext(ctx).Select("datname").
		Table("pg_database").
		Where("datistemplate = false").
		Order("datname").
		Find(&databases).Error

	if err != nil {
		return nil, err
	}

	go func() {
		err := r.cache.Set(ctx, cacheKey, databases, nil)
		if err != nil {
			r.logger.Error(err)
		}
	}()

	return databases, nil
}

type Schema struct {
	Name string `gorm:"column:schema_name"`
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

	query := r.db.WithContext(ctx).Select("schema_name").
		Table("information_schema.schemata").
		Where("schema_name NOT IN ('pg_catalog', 'information_schema')")

	if database != nil {
		query = query.Where("catalog_name = ?", lo.FromPtr(database))
	}

	err := query.
		Order("schema_name").
		Find(&schemas).Error

	if err != nil {
		return nil, err
	}

	go func() {
		err := r.cache.Set(ctx, cacheKey, schemas, nil)
		if err != nil {
			r.logger.Error(err)
		}
	}()

	return schemas, nil
}

type Table struct {
	Name string `gorm:"column:table_name"`
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

	query := r.db.WithContext(ctx).Table("pg_namespace AS n").
		Select("n.nspname AS schema_name, t.tablename AS table_name").
		Joins("LEFT JOIN pg_tables t ON n.nspname = t.schemaname::name").
		Where("n.nspname NOT IN ('pg_catalog', 'information_schema')").
		Where("t.tablename != ''")

	if schema != nil {
		query = query.Where("n.nspname = ?", lo.FromPtr(schema))
	}

	err := query.Order("table_name").
		Find(&tables).Error

	if err != nil {
		return nil, err
	}

	go func() {
		err := r.cache.Set(ctx, cacheKey, tables, nil)
		if err != nil {
			r.logger.Error(err)
		}
	}()

	return tables, nil
}

type View struct {
	Name string `gorm:"column:table_name"`
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

	query := r.db.WithContext(ctx).Select("table_name").
		Table("information_schema.views").
		Where("table_schema NOT IN ('pg_catalog', 'information_schema')")

	if database != nil {
		query = query.Where("table_catalog = ?", lo.FromPtr(database))
	}

	if schema != nil {
		query = query.Where("table_schema = ?", lo.FromPtr(schema))
	}

	err := query.
		Order("table_name").
		Find(&views).Error

	if err != nil {
		return nil, err
	}

	go func() {
		err := r.cache.Set(ctx, cacheKey, views, nil)
		if err != nil {
			r.logger.Error(err)
		}
	}()

	return views, nil
}

type MaterializedView struct {
	Name string `gorm:"column:matviewname"`
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

	query := r.db.WithContext(ctx).Select("matviewname").
		Table("pg_matviews").
		Where("schemaname NOT IN ('pg_catalog', 'information_schema')")

	if schema != nil {
		query = query.Where("schemaname = ?", lo.FromPtr(schema))
	}

	err := query.
		Order("matviewname").
		Find(&mvs).Error

	if err != nil {
		return nil, err
	}

	go func() {
		err := r.cache.Set(ctx, cacheKey, mvs, nil)
		if err != nil {
			r.logger.Error(err)
		}
	}()

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

		if len(columnNames) > 0 {
			return columns, nil
		}
	}

	query := r.db.WithContext(ctx).Table("pg_attribute AS a").
		Select(`
			a.attnum AS ordinal_position,
			a.attname AS column_name,
			format_type(a.atttypid, a.atttypmod) AS data_type,
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

	go func() {
		err := r.cache.Set(ctx, cacheKey, columns, nil)
		if err != nil {
			r.logger.Error(err)
		}
	}()

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

	go func() {
		err := r.cache.Set(ctx, cacheKey, templates, nil)
		if err != nil {
			r.logger.Error(err)
		}
	}()

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

	err := query.
		Order("kcu.column_name").
		Find(&primaryKeys).Error

	if err != nil {
		return nil, err
	}

	go func() {
		err := r.cache.Set(ctx, cacheKey, primaryKeys, nil)
		if err != nil {
			r.logger.Error(err)
		}
	}()

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

	go func() {
		err := r.cache.Set(ctx, cacheKey, foreignKeys, nil)
		if err != nil {
			r.logger.Error(err)
		}
	}()

	return foreignKeys, err
}

func (r *PostgresRepository) cacheKey(args ...string) string {
	return fmt.Sprintf("query_generator:%d:%s", r.connection.ID, strings.Join(args, "_"))
}
