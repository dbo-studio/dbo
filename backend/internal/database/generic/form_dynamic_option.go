package databaseGeneric

import (
	"context"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
)

// GetDynamicFieldOptions answers the foreign key form: the columns of the chosen target table.
func (r *Repository) GetDynamicFieldOptions(ctx context.Context, req *contract.DynamicFieldRequest) ([]contract.FormFieldOption, error) {
	ns, _ := node(req.NodeID)
	table := req.Parameters["table"]

	if req.Parameters["field"] != "columns" || table == "" {
		return nil, errUnsupportedForm
	}

	columns, err := r.d.Columns(ctx, r.base.DB().WithContext(ctx), ns, table)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	return columnOptions(columns), nil
}
