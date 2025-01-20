package serviceDesign

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/driver/pgsql"
	"github.com/samber/lo"
)

func indexListToResponse(indexes []pgsqlDriver.IndexInfo) *dto.GetDesignIndexResponse {
	data := make([]dto.GetDesignIndex, 0)
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

func columnListToResponse(columns []pgsqlDriver.Structure) []dto.GetDesignColumn {
	data := make([]dto.GetDesignColumn, 0)
	for _, column := range columns {
		var col dto.GetDesignColumn

		col.Name = column.ColumnName
		col.Type = column.DataType
		col.MappedType = column.MappedType
		col.Editable = column.Editable
		col.IsActive = column.IsActive

		if column.IsNullable == "NO" {
			col.NotNull = false
		}

		if column.CharacterMaximumLength.Valid {
			col.Length = lo.ToPtr[int32](column.CharacterMaximumLength.Int32)
		}

		if column.ColumnDefault.Valid {
			col.Default = lo.ToPtr[string](column.ColumnDefault.String)
		}

		if column.Comment.Valid {
			col.Comment = lo.ToPtr[string](column.Comment.String)
		}

		data = append(data, col)
	}

	return data
}

func updateDesignToResponse(result *pgsqlDriver.UpdateQueryResult) *dto.UpdateDesignResponse {
	return &dto.UpdateDesignResponse{
		Query:        result.Query,
		RowsAffected: result.RowsAffected,
	}
}
