package databaseGeneric

import (
	"context"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

func (r *Repository) TableStructure(ctx context.Context, table string, database, schema *string) (*contract.TableStructure, error) {
	ns, err := r.resolveNamespace(ctx, database, schema)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	db := r.base.DB().WithContext(ctx)

	columns, err := r.d.Columns(ctx, db, ns, table)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	foreignKeys, err := r.d.ForeignKeys(ctx, db, ns, table)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	indexes, err := r.d.Indexes(ctx, db, ns, table)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	return &contract.TableStructure{
		Columns: lo.Map(columns, func(c ColumnInfo, _ int) contract.StructureColumn {
			return contract.StructureColumn{Name: c.Name, DataType: c.DataType, NotNull: c.NotNull, Default: lo.FromPtr(c.Default), IsPrimaryKey: c.IsPrimaryKey}
		}),
		Indexes: indexes,
		ForeignKeys: lo.Map(foreignKeys, func(fk ForeignKey, _ int) contract.StructureForeignKey {
			return contract.StructureForeignKey{Name: fk.Name, Columns: fk.Columns, RefTable: fk.RefTable, RefColumns: fk.RefColumns, OnDelete: fk.OnDelete}
		}),
	}, nil
}
