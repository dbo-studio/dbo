package pgsql

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/khodemobin/dbo/api/dto"
	"gorm.io/gorm"
)

type PostgresQueryEngine struct {
	OpenConnections map[int32]*gorm.DB
	DB              *gorm.DB
}

func InitPostgresEngine(db *gorm.DB) *PostgresQueryEngine {
	return &PostgresQueryEngine{
		OpenConnections: map[int32]*gorm.DB{},
		DB:              db,
	}
}

type RunQueryResult struct {
	Query string
	Data  []map[string]interface{}
}

func (p *PostgresQueryEngine) RunQuery(dto *dto.RunQueryDto) (*RunQueryResult, error) {
	query := p.queryGenerator(dto)

	db, err := p.Connect(dto.ConnectionId)
	if err != nil {
		return nil, errors.New("Connection error: " + err.Error())
	}

	queryResults := []map[string]interface{}{}
	result := db.Raw(query).Find(&queryResults)
	if result.Error != nil {
		return nil, result.Error
	}

	for i := range queryResults {
		queryResults[i]["dbo_index"] = i
	}

	return &RunQueryResult{
		Query: query,
		Data:  queryResults,
	}, nil
}

type RawQueryResult struct {
	Query   string
	Data    []map[string]interface{}
	Columns []Structure
}

func (p *PostgresQueryEngine) RawQuery(dto *dto.RawQueryDto) (*RawQueryResult, error) {
	db, err := p.Connect(dto.ConnectionId)
	if err != nil {
		return nil, errors.New("Connection error: " + err.Error())
	}

	queryResults := []map[string]interface{}{}
	result := db.Raw(dto.Query).Find(&queryResults)
	if result.Error != nil {
		return nil, result.Error
	}

	rows, err := db.Raw(dto.Query).Rows()
	if err != nil {
		return nil, err
	}

	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	columnTypes, err := rows.ColumnTypes()
	if err != nil {
		return nil, err
	}

	for i := range queryResults {
		queryResults[i]["dbo_index"] = i
	}

	structures := []Structure{}

	for i, column := range columns {
		structures = append(structures, Structure{
			ColumnName: column,
			DataType:   columnTypes[i].Name(),
			MappedType: p.columnMappedFormat(columnTypes[i].Name()),
		})
	}

	return &RawQueryResult{
		Query:   dto.Query,
		Data:    queryResults,
		Columns: structures,
	}, nil
}

type UpdateQueryResult struct {
	Query        []string
	RowsAffected int64
}

func (p *PostgresQueryEngine) UpdateQuery(dto *dto.UpdateQueryDto) (*UpdateQueryResult, error) {
	db, err := p.Connect(dto.ConnectionId)
	if err != nil {
		return nil, errors.New("Connection error: " + err.Error())
	}

	queries := p.updateQueryGenerator(dto)
	queries = append(queries, p.insertQueryGenerator(dto)...)
	queries = append(queries, p.deleteQueryGenerator(dto)...)

	err = db.Transaction(func(tx *gorm.DB) error {
		for _, query := range queries {
			result := tx.Exec(query)
			if result.Error != nil {
				return errors.New("Error on " + query + " " + result.Error.Error())
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return &UpdateQueryResult{
		Query:        queries,
		RowsAffected: 1,
	}, nil
}

func (p *PostgresQueryEngine) Databases(connectionId int32, withTemplates bool) ([]string, error) {
	db, err := p.Connect(connectionId)
	if err != nil {
		return nil, errors.New("Connection error: " + err.Error())
	}

	query := "SELECT datname FROM pg_database"
	if !withTemplates {
		query += " WHERE datistemplate = false;"
	}

	type Database struct {
		Name string `gorm:"column:datname"`
	}

	databases := []Database{}
	result := db.Raw(query).Find(&databases)

	var names []string
	for _, v := range databases {
		names = append(names, v.Name)
	}

	return names, result.Error
}

func (p *PostgresQueryEngine) Schemas(connectionId int32, database string) ([]string, error) {
	db, err := p.Connect(connectionId)
	if err != nil {
		return nil, errors.New("Connection error: " + err.Error())
	}
	query := "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema') " + fmt.Sprintf("AND catalog_name = '%s'", database) + " AND schema_name NOT LIKE 'pg_%';"
	type Schema struct {
		Name string `gorm:"column:schema_name"`
	}

	schemas := []Schema{}
	result := db.Raw(query).Find(&schemas)

	names := []string{}
	for _, v := range schemas {
		names = append(names, v.Name)
	}

	return names, result.Error
}

func (p *PostgresQueryEngine) Tables(connectionId int32, schema string) ([]string, error) {
	db, err := p.Connect(connectionId)
	if err != nil {
		return nil, errors.New("Connection error: " + err.Error())
	}

	query := fmt.Sprintf("SELECT n.nspname AS schema_name,t.tablename AS table_name FROM pg_namespace n LEFT JOIN pg_tables t ON n.nspname=t.schemaname::name WHERE n.nspname = '%s' ORDER BY schema_name,table_name;", schema)

	type Info struct {
		TableName sql.NullString `gorm:"column:table_name"`
	}

	info := []Info{}
	result := db.Raw(query).Find(&info)

	if result.Error != nil {
		return nil, result.Error
	}

	var tables []string
	for _, table := range info {
		if !table.TableName.Valid {
			continue
		}

		tables = append(tables, table.TableName.String)
	}

	return tables, err
}

type Structure struct {
	OrdinalPosition        int32          `gorm:"column:ordinal_position"`
	ColumnName             string         `gorm:"column:column_name"`
	DataType               string         `gorm:"column:data_type"`
	IsNullable             string         `gorm:"column:is_nullable"`
	ColumnDefault          sql.NullString `gorm:"column:column_default"`
	CharacterMaximumLength sql.NullInt32  `gorm:"column:character_maximum_length"`
	Comment                sql.NullString `gorm:"column:column_comment"`
	MappedType             string         `gorm:"_:"`
}

func (p *PostgresQueryEngine) TableStructure(connectionId int32, table string, schema string) ([]Structure, error) {
	db, err := p.Connect(connectionId)
	if err != nil {
		return nil, errors.New("Connection error: " + err.Error())
	}

	query := fmt.Sprintf("SELECT cols.ordinal_position,cols.column_name,cols.data_type,cols.is_nullable,cols.column_default,cols.character_maximum_length,des.description AS column_comment FROM information_schema.columns AS cols LEFT JOIN pg_catalog.pg_description AS des ON(des.objoid=(SELECT c.oid FROM pg_catalog.pg_class AS c WHERE c.relname=cols.table_name)AND des.objsubid=cols.ordinal_position)WHERE cols.table_schema='%s' AND cols.table_name='%s' ORDER BY cols.ordinal_position;", schema, table)

	structures := []Structure{}
	result := db.Raw(query).Find(&structures)

	for i, structure := range structures {
		structures[i].MappedType = p.columnMappedFormat(structure.DataType)
	}

	if result.Error != nil {
		return nil, result.Error
	}

	return structures, err
}

func (p *PostgresQueryEngine) TableSpaces(connectionId int32) ([]string, error) {
	db, err := p.Connect(connectionId)
	if err != nil {
		return nil, errors.New("Connection error: " + err.Error())
	}

	query := "SELECT spcname FROM pg_tablespace;"

	type tableSpace struct {
		Name string `gorm:"column:spcname"`
	}

	tablespacesResult := []tableSpace{}
	result := db.Raw(query).Find(&tablespacesResult)

	if result.Error != nil {
		return nil, result.Error
	}

	var tablespaces []string
	for _, ts := range tablespacesResult {
		tablespaces = append(tablespaces, ts.Name)
	}

	return tablespaces, err
}

func (p *PostgresQueryEngine) Encodes() []string {
	return []string{
		"BIG5",
		"EUC_CN",
		"EUC_JP",
		"EUC_JIS_2004",
		"EUC_KR",
		"EUC_TW",
		"GB18030",
		"GBK",
		"ISO_8859_1",
		"ISO_8859_2",
		"ISO_8859_3",
		"ISO_8859_4",
		"ISO_8859_5",
		"ISO_8859_6",
		"ISO_8859_7",
		"ISO_8859_8",
		"ISO_8859_9",
		"ISO_8859_10",
		"ISO_8859_13",
		"ISO_8859_14",
		"ISO_8859_15",
		"ISO_8859_16",
		"JOHAB",
		"KOI8R",
		"KOI8U",
		"LATIN1",
		"LATIN2",
		"LATIN3",
		"LATIN4",
		"LATIN5",
		"LATIN6",
		"LATIN7",
		"LATIN8",
		"LATIN9",
		"LATIN10",
		"MULE_INTERNAL",
		"SJIS",
		"SHIFT_JIS_2004",
		"SQL_ASCII",
		"UHC",
		"UTF8",
		"WIN866",
		"WIN874",
		"WIN1250",
		"WIN1251",
		"WIN1252",
		"WIN1253",
		"WIN1254",
		"WIN1255",
		"WIN1256",
		"WIN1257",
		"WIN1258",
	}
}

func (p *PostgresQueryEngine) CreateDatabase(dto *dto.DatabaseDto) error {
	query := p.createDBQuery(dto)

	db, err := p.Connect(dto.ConnectionId)
	if err != nil {
		return errors.New("Connection error: " + err.Error())
	}

	result := db.Exec(query)

	return result.Error
}

func (p *PostgresQueryEngine) DropDatabase(dto *dto.DeleteDatabaseDto) error {
	query := fmt.Sprintf("DROP DATABASE %s", dto.Name)

	db, err := p.Connect(dto.ConnectionId)
	if err != nil {
		return errors.New("Connection error: " + err.Error())
	}

	result := db.Exec(query)

	return result.Error
}

// convert pgsql type to simple types for fronted
func (p *PostgresQueryEngine) columnMappedFormat(dataType string) string {
	switch dataType {
	case "VARCHAR", "TEXT", "UUID", "TIMESTAMP", "VARBIT":
		return "string"
	case "BOOL":
		return "boolean"
	case "INT", "INTEGER", "BIT", "FLOAT":
		return "number"
	default:
		return "string"
	}
}
