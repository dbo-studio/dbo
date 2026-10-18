package databaseSqlite

import (
	"context"
	"sort"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

func (r *SQLiteRepository) TableStructure(ctx context.Context, table string, _, _ *string) (*contract.TableStructure, error) {
	columns, err := r.getColumns(ctx, table, nil, false)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	foreignKeys, err := r.foreignKeys(ctx, table)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	indexes, err := r.tableIndexes(ctx, table)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	// The map behind foreignKeys has no order; keep the result stable.
	sort.Slice(foreignKeys, func(i, j int) bool { return foreignKeys[i].ConstraintName < foreignKeys[j].ConstraintName })

	return &contract.TableStructure{
		Columns: lo.Map(columns, func(column Column, _ int) contract.StructureColumn {
			return contract.StructureColumn{
				Name:     column.ColumnName,
				DataType: column.DataType,
				// getColumns turns PRAGMA notnull around: "1" there means the column is nullable.
				NotNull:      column.IsNullable == "0",
				Default:      column.ColumnDefault.String,
				IsPrimaryKey: sqliteColumnIsPrimaryKey(column.IsPrimaryKey),
			}
		}),
		Indexes: indexes,
		ForeignKeys: lo.Map(foreignKeys, func(fk ForeignKey, _ int) contract.StructureForeignKey {
			return contract.StructureForeignKey{
				Name:       fk.ConstraintName,
				Columns:    fk.Columns,
				RefTable:   fk.TargetTable,
				RefColumns: fk.RefColumns,
				OnDelete:   fk.DeleteAction,
			}
		}),
	}, nil
}

// tableIndexes lists the indexes of a table except the one behind its primary key.
func (r *SQLiteRepository) tableIndexes(ctx context.Context, table string) ([]contract.StructureIndex, error) {
	type indexRow struct {
		Name   string `gorm:"column:name"`
		Unique int    `gorm:"column:unique"`
		Origin string `gorm:"column:origin"`
	}

	var rows []indexRow

	if err := r.base.DB().WithContext(ctx).Raw("PRAGMA index_list(" + quote.SqliteIdent(table) + ")").Scan(&rows).Error; err != nil {
		return nil, err
	}

	indexes := make([]contract.StructureIndex, 0, len(rows))

	for _, row := range rows {
		if row.Origin == "pk" {
			continue
		}

		var columns []struct {
			Name string `gorm:"column:name"`
		}

		if err := r.base.DB().WithContext(ctx).Raw("PRAGMA index_info(" + quote.SqliteIdent(row.Name) + ")").Scan(&columns).Error; err != nil {
			return nil, err
		}

		indexes = append(indexes, contract.StructureIndex{
			Name:   row.Name,
			Unique: row.Unique == 1,
			Columns: lo.Map(columns, func(column struct {
				Name string `gorm:"column:name"`
			}, _ int) string {
				return column.Name
			}),
		})
	}

	return indexes, nil
}
