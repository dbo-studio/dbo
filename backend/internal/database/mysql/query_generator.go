package databaseMysql

import (
	"context"
	"slices"
	"strconv"
	"strings"

	"github.com/samber/lo"
	"golang.org/x/sync/errgroup"
)

type Database struct {
	Name string `gorm:"column:SCHEMA_NAME"`
}

func (r *MySQLRepository) databases(ctx context.Context, fromCache bool) ([]Database, error) {
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

	err := r.db.WithContext(ctx).Table("information_schema.SCHEMATA").
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
	tables := make([]Table, 0)
	cacheKey := r.cacheKey("tables", lo.FromPtr(database))

	if fromCache {
		err := r.cache.Get(ctx, cacheKey, &tables)
		if err != nil {
			return nil, err
		}

		if len(tables) > 0 {
			return tables, nil
		}
	}

	query := r.db.WithContext(ctx).Table("information_schema.TABLES").
		Select(`
			TABLE_NAME,
			TABLE_COMMENT,
			ENGINE,
			TABLE_TYPE,
			ROW_FORMAT,
			AUTO_INCREMENT
		`).
		Where("TABLE_TYPE = 'BASE TABLE'").
		Where("TABLE_SCHEMA = ?", lo.FromPtr(database))

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
	views := make([]View, 0)
	cacheKey := r.cacheKey("views", lo.FromPtr(database))

	if fromCache {
		err := r.cache.Get(ctx, cacheKey, &views)
		if err != nil {
			return nil, err
		}

		if len(views) > 0 {
			return views, nil
		}
	}

	query := r.db.WithContext(ctx).Table("information_schema.VIEWS").
		Select(`
			TABLE_NAME,
			TABLE_COMMENT,
			VIEW_DEFINITION
		`).
		Where("TABLE_SCHEMA = ?", lo.FromPtr(database))

	err := query.Order("TABLE_NAME").Find(&views).Error
	if err != nil {
		return nil, err
	}

	r.updateCache(ctx, cacheKey, views)

	return views, nil
}

func (r *MySQLRepository) columns(ctx context.Context, database *string, table *string, columnNames []string, editable bool, fromCache bool) ([]Column, error) {
	columns := make([]Column, 0)
	cacheKey := r.cacheKey("columns", lo.FromPtr(database), lo.FromPtr(table), strings.Join(columnNames, ","), strconv.FormatBool(editable))

	if fromCache {
		err := r.cache.Get(ctx, cacheKey, &columns)
		if err != nil {
			return nil, err
		}

		if len(columns) > 0 {
			return columns, nil
		}
	}

	query := r.db.WithContext(ctx).Table("information_schema.COLUMNS").
		Select(`
			ORDINAL_POSITION,
			COLUMN_NAME,
			DATA_TYPE,
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
	var pkList []PrimaryKey
	var fkList []ForeignKey

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

type PrimaryKey struct {
	ColumnName string `gorm:"column:COLUMN_NAME"`
}

func (r *MySQLRepository) primaryKeys(ctx context.Context, database *string, table *string, fromCache bool) ([]PrimaryKey, error) {
	primaryKeys := make([]PrimaryKey, 0)
	cacheKey := r.cacheKey("primary_keys", lo.FromPtr(database), lo.FromPtr(table))

	if fromCache {
		err := r.cache.Get(ctx, cacheKey, &primaryKeys)
		if err != nil {
			return nil, err
		}

		if len(primaryKeys) > 0 {
			return primaryKeys, nil
		}
	}

	query := r.db.WithContext(ctx).Table("information_schema.TABLE_CONSTRAINTS AS tc").
		Select("kcu.COLUMN_NAME").
		Joins("JOIN information_schema.KEY_COLUMN_USAGE AS kcu ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA").
		Where("tc.CONSTRAINT_TYPE = 'PRIMARY KEY'").
		Where("tc.TABLE_SCHEMA = ?", lo.FromPtr(database))

	if table != nil {
		query = query.Where("tc.TABLE_NAME = ?", lo.FromPtr(table))
	}

	err := query.Order("kcu.ORDINAL_POSITION").Find(&primaryKeys).Error
	if err != nil {
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
	foreignKeys := make([]ForeignKey, 0)
	cacheKey := r.cacheKey("foreign_keys", lo.FromPtr(database), lo.FromPtr(table))

	if fromCache {
		err := r.cache.Get(ctx, cacheKey, &foreignKeys)
		if err != nil {
			return nil, err
		}

		if len(foreignKeys) > 0 {
			return foreignKeys, nil
		}
	}

	query := r.db.WithContext(ctx).Table("information_schema.KEY_COLUMN_USAGE AS kcu").
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

func (r *MySQLRepository) getTableDDL(database string, tableName string) (string, error) {
	var result struct {
		Table       string `gorm:"column:Table"`
		CreateTable string `gorm:"column:Create Table"`
	}
	err := r.db.Raw("SHOW CREATE TABLE `" + database + "`.`" + tableName + "`").Scan(&result).Error
	if err != nil {
		return "", err
	}
	return result.CreateTable, nil
}
