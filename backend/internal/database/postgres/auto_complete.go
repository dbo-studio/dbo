package databasePostgres

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

func (r *PostgresRepository) AutoComplete(data *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error) {
	databases, err := r.getDatabaseList()
	if err != nil {
		return nil, err
	}

	var views []View
	if data.Database != nil && data.Schema != nil {
		views, err = r.getViewList(Database{Name: lo.FromPtr(data.Database)}, Schema{Name: lo.FromPtr(data.Schema)})
	} else {
		views, err = r.getAllViewList()
	}

	if err != nil {
		return nil, err
	}

	schemas, err := r.getAllSchemaList()
	if err != nil {
		return nil, err
	}

	var tables []Table
	if data.Schema != nil {
		tables, err = r.getTableList(Schema{Name: lo.FromPtr(data.Schema)})
	} else {
		// اگر اسکیمایی مشخص نشده، تمام جداول را برمی‌گردانیم
		tables, err = r.getAllTableList()
	}

	if err != nil {
		return nil, err
	}

	// همیشه ستون‌های هر جدول را برگردان تا context کامل‌تر شود
	columns := make(map[string][]string)
	schemaName := ""
	if data.Schema != nil {
		schemaName = lo.FromPtr(data.Schema)
	}
	for _, table := range tables {
		// اگر schemaName خالی باشد، getColumns نیاز به اسکیمای معتبر دارد؛
		// در این حالت، از information_schema برای همه اسکیمه‌ها خوانده‌ایم و getColumns ما نیاز به اسکیمای مشخص دارد.
		// پس وقتی اسکیمایی مشخص نیست، این بخش را رد می‌کنیم تا خطا ندهد.
		if schemaName == "" {
			continue
		}
		columnResult, err := r.getColumns(table.Name, schemaName, nil, false)
		if err != nil {
			return nil, err
		}
		columns[table.Name] = lo.Map(columnResult, func(x Column, _ int) string { return x.ColumnName })
	}

	return &dto.AutoCompleteResponse{
		Databases: lo.Map(databases, func(x Database, _ int) string { return x.Name }),
		Views:     lo.Map(views, func(x View, _ int) string { return x.Name }),
		Schemas:   lo.Map(schemas, func(x Schema, _ int) string { return x.Name }),
		Tables:    lo.Map(tables, func(x Table, _ int) string { return x.Name }),
		Columns:   columns,
	}, nil
}
