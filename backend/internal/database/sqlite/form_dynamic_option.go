package databaseSqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/samber/lo"
)

func (r *SQLiteRepository) GetDynamicFieldOptions(ctx context.Context, req *contract.DynamicFieldRequest) ([]contract.FormFieldOption, error) {
	params := req.Parameters

	switch params["field"] {
	case "columns":
		targetTable, ok := params["table"]
		if !ok {
			return nil, errors.New("table is required in parameters")
		}

		columns, err := r.getColumns(ctx, targetTable, []string{}, true)
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
	case "fk_values":
		return r.fkValueOptions(ctx, params)
	case "":
		return nil, errors.New("field is required in parameters")
	default:
		return nil, fmt.Errorf("unsupported dynamic field %q", params["field"])
	}
}

func (r *SQLiteRepository) fkValueOptions(ctx context.Context, params map[string]string) ([]contract.FormFieldOption, error) {
	targetTable := strings.TrimSpace(params["table"])
	if targetTable == "" {
		return nil, errors.New("table is required in parameters")
	}

	requestedKeys := databaseCore.ParseFkKeyColumns(params)
	if len(requestedKeys) == 0 {
		return nil, errors.New("keyColumn is required in parameters")
	}

	columns, err := r.getColumns(ctx, targetTable, []string{}, false)
	if err != nil {
		return nil, err
	}

	candidates := lo.Map(columns, func(c Column, _ int) databaseCore.FkLabelCandidate {
		return databaseCore.FkLabelCandidate{
			Name:         c.ColumnName,
			MappedType:   c.MappedType,
			IsPrimaryKey: c.IsPrimaryKey == "1",
		}
	})

	keyColumns, err := databaseCore.ResolveFkKeyColumns(requestedKeys, candidates)
	if err != nil {
		return nil, err
	}

	labelColumn, searchColumns := databaseCore.PickFkLabelColumns(keyColumns, candidates)
	limit := databaseCore.ParseFkLookupLimit(params["limit"])
	q := strings.TrimSpace(params["q"])

	query := databaseCore.BuildFkLookupQuery(databaseCore.FkLookupDialect{
		QuoteIdent:   databaseCore.QuoteSQLiteIdent,
		CastToText:   func(quoted string) string { return "CAST(" + quoted + " AS TEXT)" },
		LikeOperator: "LIKE",
		FromClause:   databaseCore.QuoteSQLiteIdent(targetTable),
	}, keyColumns, labelColumn, searchColumns, q, limit)

	lookupCtx, cancel := context.WithTimeout(ctx, databaseCore.FkLookupTimeout)
	defer cancel()

	sqlRows, err := r.base.DB().WithContext(lookupCtx).Raw(query.SQL, query.Args...).Rows()
	if err != nil {
		return nil, err
	}
	defer sqlRows.Close()

	return scanFkLookupOptions(sqlRows, keyColumns)
}

func scanFkLookupOptions(sqlRows *sql.Rows, keyColumns []string) ([]contract.FormFieldOption, error) {
	options := make([]contract.FormFieldOption, 0)

	for sqlRows.Next() {
		vals := make([]sql.NullString, len(keyColumns)+1)

		ptrs := make([]any, len(vals))
		for i := range vals {
			ptrs[i] = &vals[i]
		}

		if err := sqlRows.Scan(ptrs...); err != nil {
			return nil, err
		}

		keyValues := make([]string, len(keyColumns))
		for i := range keyColumns {
			if vals[i].Valid {
				keyValues[i] = vals[i].String
			}
		}

		label := ""
		if vals[len(keyColumns)].Valid {
			label = vals[len(keyColumns)].String
		}

		value, display := databaseCore.MakeFkLookupOption(keyColumns, keyValues, label)
		options = append(options, contract.FormFieldOption{
			Value: value,
			Label: display,
		})
	}

	if err := sqlRows.Err(); err != nil {
		return nil, err
	}

	return options, nil
}
