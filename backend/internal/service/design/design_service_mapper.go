package serviceDesign

import (
	"github.com/dbo-studio/dbo/api/dto"
	pgsql "github.com/dbo-studio/dbo/driver/pgsql"
	"github.com/samber/lo"
)

func indexListToResponse(indexes []pgsql.IndexInfo) *dto.GetDesignIndexResponse {
	data := make([]dto.GetDesignIndex, len(indexes))
	for _, i := range indexes {
		index := dto.GetDesignIndex{
			IndexName:       i.IndexName,
			IndexAlgorithm:  i.IndexAlgorithm,
			IsUnique:        i.IsUnique,
			IndexDefinition: i.IndexDefinition,
			ColumnName:      i.ColumnName,
			Condition:       i.Condition,
		}

		if i.Comment.Valid {
			index.Comment = lo.ToPtr[string](i.Comment.String)
		}

		data = append(data, index)
	}

	return &dto.GetDesignIndexResponse{
		Indices: data,
	}
}

func columnListToResponse(columns []pgsql.Structure) *dto.GetDesignColumnResponse {
	data := make([]dto.GetDesignColumn, len(columns))
	for _, col := range columns {
		column := dto.GetDesignColumn{
			OrdinalPosition: col.OrdinalPosition,
			ColumnName:      col.ColumnName,
			DataType:        col.DataType,
			IsNullable:      col.IsNullable,
			MappedType:      col.MappedType,
			Editable:        col.Editable,
			IsActive:        col.IsActive,
		}

		if col.ColumnDefault.Valid {
			column.ColumnDefault = lo.ToPtr[string](col.ColumnDefault.String)
		}

		if col.CharacterMaximumLength.Valid {
			column.CharacterMaximumLength = lo.ToPtr[int32](col.CharacterMaximumLength.Int32)
		}

		if col.Comment.Valid {
			column.Comment = lo.ToPtr[string](col.Comment.String)
		}

		data = append(data, column)
	}

	return &dto.GetDesignColumnResponse{
		Columns: data,
	}
}

func updateDesignToResponse(result *pgsql.UpdateQueryResult) *dto.UpdateDesignResponse {
	return &dto.UpdateDesignResponse{
		Query:        result.Query,
		RowsAffected: result.RowsAffected,
	}
}
