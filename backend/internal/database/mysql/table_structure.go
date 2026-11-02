package databaseMysql

import (
	"context"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

func (r *MySQLRepository) TableStructure(ctx context.Context, table string, database, _ *string) (*contract.TableStructure, error) {
	columns, err := r.columns(ctx, database, &table, nil, false, false)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	primaryKeys, err := r.primaryKeys(ctx, database, &table, false)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	foreignKeys, err := r.foreignKeys(ctx, database, &table, false)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	indexRows, err := r.tableIndexes(ctx, lo.FromPtr(database), table)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	primary := lo.SliceToMap(primaryKeys, func(key PrimaryKey) (string, bool) { return key.ColumnName, true })

	return &contract.TableStructure{
		Columns: lo.Map(columns, func(column Column, _ int) contract.StructureColumn {
			return contract.StructureColumn{
				Name:         column.ColumnName,
				DataType:     column.ColumnType,
				NotNull:      column.IsNullable == "NO",
				Default:      lo.FromPtr(column.ColumnDefault),
				IsPrimaryKey: primary[column.ColumnName],
			}
		}),
		Indexes: mysqlIndexes(indexRows),
		ForeignKeys: lo.Map(foreignKeys, func(fk ForeignKey, _ int) contract.StructureForeignKey {
			return contract.StructureForeignKey{
				Name:       fk.ConstraintName,
				Columns:    fk.ColumnsList,
				RefTable:   fk.TargetTable,
				RefColumns: fk.RefColumnsList,
				OnDelete:   fk.DeleteAction,
			}
		}),
	}, nil
}

// mysqlIndexes groups the one-row-per-column statistics into indexes, leaving
// out the primary key.
func mysqlIndexes(rows []TableIndex) []contract.StructureIndex {
	var indexes []contract.StructureIndex

	for _, row := range rows {
		if row.IndexName == "PRIMARY" {
			continue
		}

		if last := len(indexes) - 1; last >= 0 && indexes[last].Name == row.IndexName {
			indexes[last].Columns = append(indexes[last].Columns, row.ColumnName)
			continue
		}

		indexes = append(indexes, contract.StructureIndex{
			Name:    row.IndexName,
			Columns: []string{row.ColumnName},
			Unique:  row.NonUnique == 0,
		})
	}

	return indexes
}
