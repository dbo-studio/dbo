package databaseSqlite

import (
	"context"
	"errors"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func (r *SQLiteRepository) GetDynamicFieldOptions(ctx context.Context, req *contract.DynamicFieldRequest) ([]contract.FormFieldOption, error) {
	params := req.Parameters

	switch params["field"] {
	case "columns":
		targetTable, ok := params["table"]
		if !ok {
			return nil, errors.New("table is required in parameters")
		}

		columns, err := r.getColumns(targetTable, []string{}, true)
		if err != nil {
			return nil, err
		}

		options := make([]contract.FormFieldOption, len(columns))
		for i, column := range columns {
			options[i] = contract.FormFieldOption{
				Value: column.ColumnName,
				Label: column.ColumnName,
			}
		}

		return options, nil
	}

	return nil, errors.New("field is required in parameters")
}
