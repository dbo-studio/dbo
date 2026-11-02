package databasePostgres

import (
	"context"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

func (r *PostgresRepository) TableStructure(ctx context.Context, table string, database, schema *string) (*contract.TableStructure, error) {
	columns, err := r.columns(ctx, database, &table, schema, nil, false, false)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	primaryKeys, err := r.primaryKeys(ctx, database, &table, schema, false)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	foreignKeys, err := r.foreignKeys(ctx, database, &table, schema, false)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	indexes, err := r.structureIndexes(ctx, database, lo.CoalesceOrEmpty(lo.FromPtr(schema), "public"), table)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	primary := lo.SliceToMap(primaryKeys, func(key PrimaryKey) (string, bool) { return key.ColumnName, true })

	return &contract.TableStructure{
		Columns: lo.Map(columns, func(column Column, _ int) contract.StructureColumn {
			return contract.StructureColumn{
				Name:         column.ColumnName,
				DataType:     column.DataType,
				NotNull:      column.IsNullable == "NO",
				Default:      lo.FromPtr(column.ColumnDefault),
				IsPrimaryKey: primary[column.ColumnName],
			}
		}),
		Indexes: indexes,
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

// structureIndexes lists the indexes of a table except the one behind its primary key.
func (r *PostgresRepository) structureIndexes(ctx context.Context, database *string, schema, table string) ([]contract.StructureIndex, error) {
	conn, err := r.db(ctx, database)
	if err != nil {
		return nil, err
	}

	type indexRow struct {
		IndexName string `gorm:"column:index_name"`
		IsUnique  bool   `gorm:"column:is_unique"`
		Columns   string `gorm:"column:columns"`
	}

	var rows []indexRow

	err = conn.WithContext(ctx).Raw(`
		SELECT i.relname AS index_name,
		       ix.indisunique AS is_unique,
		       array_to_string(array_agg(a.attname ORDER BY k.ord), ',') AS columns
		FROM pg_index ix
		JOIN pg_class t ON t.oid = ix.indrelid
		JOIN pg_class i ON i.oid = ix.indexrelid
		JOIN pg_namespace n ON n.oid = t.relnamespace
		JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, ord) ON true
		JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
		WHERE t.relname = ? AND n.nspname = ? AND NOT ix.indisprimary
		GROUP BY i.relname, ix.indisunique
		ORDER BY i.relname
	`, table, schema).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	return lo.Map(rows, func(row indexRow, _ int) contract.StructureIndex {
		return contract.StructureIndex{Name: row.IndexName, Unique: row.IsUnique, Columns: strings.Split(row.Columns, ",")}
	}), nil
}
