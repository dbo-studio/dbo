package databaseMysql

import (
	"context"
	"errors"
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
	Name string `gorm:"column:SCHEMA_NAME"`
}

func (r *MySQLRepository) databases(ctx context.Context, fromCache bool) ([]Database, error) {
	var databases []Database

	cacheKey := cache.MySQLQueryKey(r.base.Connection().ID, "databases")

	if fromCache {
		err := r.base.Cache().Get(ctx, cacheKey, &databases)
		if err != nil {
			return nil, err
		}

		if databases != nil {
			return databases, nil
		}
	}

	err := r.base.DB().WithContext(ctx).Table("information_schema.SCHEMATA").
		Select("SCHEMA_NAME").
		Where("SCHEMA_NAME NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')").
		Order("SCHEMA_NAME").
		Find(&databases).Error
	if err != nil {
		return nil, err
	}

	r.updateCache(ctx, cacheKey, databases)

	return databases, nil
}

type Table struct {
	Name          string  `gorm:"column:TABLE_NAME"`
	Comment       *string `gorm:"column:TABLE_COMMENT"`
	Engine        *string `gorm:"column:ENGINE"`
	TableType     string  `gorm:"column:TABLE_TYPE"`
	RowFormat     *string `gorm:"column:ROW_FORMAT"`
	AutoIncrement *int64  `gorm:"column:AUTO_INCREMENT"`
}

func (r *MySQLRepository) tables(ctx context.Context, database *string, fromCache bool) ([]Table, error) {
	var tables []Table

	cacheKey := cache.MySQLQueryKey(r.base.Connection().ID, "tables", lo.FromPtr(database))

	if fromCache {
		err := r.base.Cache().Get(ctx, cacheKey, &tables)
		if err != nil {
			return nil, err
		}

		if tables != nil {
			return tables, nil
		}
	}

	query := r.base.DB().WithContext(ctx).
		Table("information_schema.TABLES AS t").
		Select(`
		t.TABLE_NAME,
		t.TABLE_COMMENT,
		t.ENGINE,
		t.TABLE_TYPE,
		t.ROW_FORMAT,
		t.AUTO_INCREMENT
	`).Where("t.TABLE_TYPE = ?", "BASE TABLE")

	if database != nil {
		query = query.Where("t.TABLE_SCHEMA = ?", lo.FromPtr(database))
	} else {
		query = query.Where("t.TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')")
	}

	err := query.Order("TABLE_NAME").Find(&tables).Error
	if err != nil {
		return nil, err
	}

	r.updateCache(ctx, cacheKey, tables)

	return tables, nil
}

type View struct {
	Name    string  `gorm:"column:TABLE_NAME"`
	Comment *string `gorm:"column:TABLE_COMMENT"`
	Query   *string `gorm:"column:VIEW_DEFINITION"`
}

func (r *MySQLRepository) views(ctx context.Context, database *string, fromCache bool) ([]View, error) {
	var views []View

	cacheKey := cache.MySQLQueryKey(r.base.Connection().ID, "views", lo.FromPtr(database))

	if fromCache {
		err := r.base.Cache().Get(ctx, cacheKey, &views)
		if err != nil {
			return nil, err
		}

		if views != nil {
			return views, nil
		}
	}

	query := r.base.DB().WithContext(ctx).
		Table("information_schema.VIEWS").
		Select(`
		TABLE_NAME,
		VIEW_DEFINITION
	`).Where("TABLE_SCHEMA = ?", lo.FromPtr(database))

	err := query.Order("TABLE_NAME").Find(&views).Error
	if err != nil {
		return nil, err
	}

	r.updateCache(ctx, cacheKey, views)

	return views, nil
}

func (r *MySQLRepository) columns(ctx context.Context, database *string, table *string, columnNames []string, editable bool, fromCache bool) ([]Column, error) {
	var columns []Column

	cacheKey := cache.MySQLQueryKey(r.base.Connection().ID, "columns", lo.FromPtr(database), lo.FromPtr(table), strings.Join(columnNames, ","), strconv.FormatBool(editable))

	if fromCache {
		err := r.base.Cache().Get(ctx, cacheKey, &columns)
		if err != nil {
			return nil, err
		}

		if columns != nil {
			return columns, nil
		}
	}

	query := r.base.DB().WithContext(ctx).Table("information_schema.COLUMNS").
		Select(`
			ORDINAL_POSITION,
			COLUMN_NAME,
			DATA_TYPE,
			COLUMN_TYPE,
			IS_NULLABLE,
			COLUMN_DEFAULT,
			CHARACTER_MAXIMUM_LENGTH,
			COLUMN_COMMENT,
			NUMERIC_SCALE
		`).
		Where("TABLE_SCHEMA = ?", lo.FromPtr(database))

	if table != nil {
		query = query.Where("TABLE_NAME = ?", lo.FromPtr(table))
	}

	g, gctx := errgroup.WithContext(ctx)
	g.SetLimit(6)

	var (
		pkList []PrimaryKey
		fkList []ForeignKey
	)

	g.Go(func() error {
		err := query.WithContext(gctx).
			Order("ORDINAL_POSITION").
			Find(&columns).Error
		if err != nil {
			return err
		}

		return nil
	})

	g.Go(func() error {
		list, err := r.primaryKeys(gctx, database, table, fromCache)
		if err != nil {
			return err
		}

		pkList = list

		return nil
	})

	g.Go(func() error {
		list, err := r.foreignKeys(gctx, database, table, fromCache)
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

		if enumValues := databaseCore.ParseMysqlEnumOrSetValues(column.ColumnType); len(enumValues) > 0 {
			// SET is multi-value — keep as string (not a single-select enum).
			if strings.HasPrefix(strings.ToLower(strings.TrimSpace(column.ColumnType)), "enum(") {
				columns[i].MappedType = databaseCore.MappedTypeEnum
				columns[i].EnumValues = enumValues
			}
		}

		// MySQL BOOLEAN is an alias for TINYINT(1); treat it as boolean for the grid.
		if isMysqlBooleanColumn(column.DataType, column.ColumnType) {
			columns[i].MappedType = databaseCore.MappedTypeBoolean
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

	r.updateCache(ctx, cacheKey, columns)

	return columns, nil
}

func (r *MySQLRepository) columnsLite(ctx context.Context, database *string, table *string, fromCache bool) ([]string, error) {
	var names []string

	cacheKey := cache.MySQLQueryKey(r.base.Connection().ID, "columns_lite", lo.FromPtr(database), lo.FromPtr(table))

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

	type columnNameRow struct {
		ColumnName string `gorm:"column:COLUMN_NAME"`
	}

	rows := make([]columnNameRow, 0)
	query := r.base.DB().WithContext(ctx).Table("information_schema.COLUMNS").
		Select("COLUMN_NAME").
		Where("TABLE_SCHEMA = ?", lo.FromPtr(database))

	if table != nil {
		query = query.Where("TABLE_NAME = ?", lo.FromPtr(table))
	}

	err := query.Order("ORDINAL_POSITION").Find(&rows).Error
	if err != nil {
		return nil, err
	}

	names = lo.Map(rows, func(row columnNameRow, _ int) string { return row.ColumnName })
	r.updateCache(ctx, cacheKey, names)

	return names, nil
}

func (r *MySQLRepository) columnsLiteBatch(ctx context.Context, database *string) (map[string][]string, error) {
	type columnNameRow struct {
		TableName  string `gorm:"column:TABLE_NAME"`
		ColumnName string `gorm:"column:COLUMN_NAME"`
	}

	rows := make([]columnNameRow, 0)

	err := r.base.DB().WithContext(ctx).Table("information_schema.COLUMNS").
		Select("TABLE_NAME, COLUMN_NAME").
		Where("TABLE_SCHEMA = ?", lo.FromPtr(database)).
		Order("TABLE_NAME, ORDINAL_POSITION").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}

	out := make(map[string][]string)
	for _, row := range rows {
		out[row.TableName] = append(out[row.TableName], row.ColumnName)
	}

	return out, nil
}

type PrimaryKey struct {
	ColumnName string `gorm:"column:COLUMN_NAME"`
}

func (r *MySQLRepository) primaryKeys(ctx context.Context, database *string, table *string, fromCache bool) ([]PrimaryKey, error) {
	var primaryKeys []PrimaryKey

	cacheKey := cache.MySQLQueryKey(r.base.Connection().ID, "primary_keys", lo.FromPtr(database), lo.FromPtr(table))

	if fromCache {
		err := r.base.Cache().Get(ctx, cacheKey, &primaryKeys)
		if err != nil {
			return nil, err
		}

		if primaryKeys != nil {
			return primaryKeys, nil
		}
	}

	query := r.base.DB().WithContext(ctx).
		Table("information_schema.TABLE_CONSTRAINTS AS tc").
		Select("kcu.COLUMN_NAME").
		Joins(`
		JOIN information_schema.KEY_COLUMN_USAGE AS kcu 
			ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
			AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA
			AND kcu.TABLE_NAME = tc.TABLE_NAME
	`).
		Where("tc.CONSTRAINT_TYPE = ?", "PRIMARY KEY").
		Where("tc.TABLE_SCHEMA = ?", lo.FromPtr(database))

	if table != nil {
		query = query.Where("tc.TABLE_NAME = ?", lo.FromPtr(table))
	}

	err := query.Order("kcu.ORDINAL_POSITION").Find(&primaryKeys).Error
	if err != nil {
		if errors.Is(err, context.Canceled) {
			return []PrimaryKey{}, nil
		}

		return nil, err
	}

	r.updateCache(ctx, cacheKey, primaryKeys)

	return primaryKeys, nil
}

type ForeignKey struct {
	ConstraintName string `gorm:"column:CONSTRAINT_NAME"`
	Columns        string `gorm:"column:COLUMN_NAME"`
	TargetTable    string `gorm:"column:REFERENCED_TABLE_NAME"`
	RefColumns     string `gorm:"column:REFERENCED_COLUMN_NAME"`
	UpdateAction   string `gorm:"column:UPDATE_RULE"`
	DeleteAction   string `gorm:"column:DELETE_RULE"`

	ColumnsList    []string `gorm:"-"`
	RefColumnsList []string `gorm:"-"`
}

func (r *MySQLRepository) foreignKeys(ctx context.Context, database *string, table *string, fromCache bool) ([]ForeignKey, error) {
	var foreignKeys []ForeignKey

	cacheKey := cache.MySQLQueryKey(r.base.Connection().ID, "foreign_keys", lo.FromPtr(database), lo.FromPtr(table))

	if fromCache {
		err := r.base.Cache().Get(ctx, cacheKey, &foreignKeys)
		if err != nil {
			return nil, err
		}

		if foreignKeys != nil {
			return foreignKeys, nil
		}
	}

	query := r.base.DB().WithContext(ctx).Table("information_schema.KEY_COLUMN_USAGE AS kcu").
		Select(`
			kcu.CONSTRAINT_NAME,
			kcu.COLUMN_NAME,
			kcu.REFERENCED_TABLE_NAME,
			kcu.REFERENCED_COLUMN_NAME,
			rc.UPDATE_RULE,
			rc.DELETE_RULE
		`).
		Joins("JOIN information_schema.REFERENTIAL_CONSTRAINTS AS rc ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND rc.CONSTRAINT_SCHEMA = kcu.TABLE_SCHEMA").
		Where("kcu.REFERENCED_TABLE_NAME IS NOT NULL").
		Where("kcu.TABLE_SCHEMA = ?", lo.FromPtr(database))

	if table != nil {
		query = query.Where("kcu.TABLE_NAME = ?", lo.FromPtr(table))
	}

	err := query.Order("kcu.CONSTRAINT_NAME, kcu.ORDINAL_POSITION").Find(&foreignKeys).Error
	if err != nil {
		// If context was canceled, return empty list instead of error
		// This can happen when errgroup cancels context if another goroutine completes/fails
		if errors.Is(err, context.Canceled) {
			return []ForeignKey{}, nil
		}

		return nil, err
	}

	fkMap := make(map[string]*ForeignKey)
	for _, fk := range foreignKeys {
		if existing, exists := fkMap[fk.ConstraintName]; exists {
			existing.ColumnsList = append(existing.ColumnsList, fk.Columns)
			existing.RefColumnsList = append(existing.RefColumnsList, fk.RefColumns)
		} else {
			newFK := fk
			newFK.ColumnsList = []string{fk.Columns}
			newFK.RefColumnsList = []string{fk.RefColumns}
			fkMap[fk.ConstraintName] = &newFK
		}
	}

	result := make([]ForeignKey, 0, len(fkMap))
	for _, fk := range fkMap {
		result = append(result, *fk)
	}

	r.updateCache(ctx, cacheKey, result)

	return result, nil
}

func (r *MySQLRepository) updateCache(ctx context.Context, cacheKey string, value any) {
	bgCtx := context.WithoutCancel(ctx)

	go func() {
		err := r.base.Cache().Set(bgCtx, cacheKey, value, lo.ToPtr(time.Hour))
		if err != nil {
			r.base.Logger().Error(err)
		}
	}()
}
