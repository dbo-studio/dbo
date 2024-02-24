package pgsql

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/khodemobin/dbo/api/dto"
)

type RunQueryResult struct {
	Query string
	Data  []map[string]interface{}
}

func RunQuery(dto *dto.RunQueryDto) (*RunQueryResult, error) {
	query, err := queryGenerator(dto)
	if err != nil {
		return nil, errors.New("Generate query error: " + err.Error())
	}

	db, err := Connect(dto.ConnectionId)
	if err != nil {
		return nil, errors.New("Connection error: " + err.Error())
	}

	var queryResults []map[string]interface{}
	result := db.Raw(query).Scan(&queryResults)
	if result.Error != nil {
		return nil, result.Error
	}

	return &RunQueryResult{
		Query: query,
		Data:  queryResults,
	}, nil
}

func Databases(connectionId int32, withTemplates bool) ([]string, error) {
	db, err := Connect(connectionId)
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

	var databases []Database
	result := db.Raw(query).Scan(&databases)

	var names []string
	for _, v := range databases {
		names = append(names, v.Name)
	}

	return names, result.Error
}

func Schemas(connectionId int32) ([]string, error) {
	db, err := Connect(connectionId)
	if err != nil {
		return nil, errors.New("Connection error: " + err.Error())
	}
	query := "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema') AND schema_name NOT LIKE 'pg_%';"

	type Database struct {
		Name string `gorm:"column:schema_name"`
	}

	var databases []Database
	result := db.Raw(query).Scan(&databases)

	var names []string
	for _, v := range databases {
		names = append(names, v.Name)
	}

	return names, result.Error
}

func Tables(connectionId int32, schema string) ([]string, error) {
	db, err := Connect(connectionId)
	if err != nil {
		return nil, errors.New("Connection error: " + err.Error())
	}

	query := fmt.Sprintf("SELECT n.nspname AS schema_name,t.tablename AS table_name FROM pg_namespace n LEFT JOIN pg_tables t ON n.nspname=t.schemaname::name WHERE n.nspname = '%s' ORDER BY schema_name,table_name;", schema)

	type Info struct {
		TableName sql.NullString `gorm:"column:table_name"`
	}

	var info []Info
	result := db.Raw(query).Scan(&info)

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
}

func TableStructure(connectionId int32, table string, schema string) ([]Structure, error) {
	db, err := Connect(connectionId)
	if err != nil {
		return nil, errors.New("Connection error: " + err.Error())
	}

	query := fmt.Sprintf("SELECT ordinal_position,column_name,data_type,is_nullable,column_default,character_maximum_length FROM information_schema.columns WHERE table_schema='%s' AND table_name='%s' ORDER BY ordinal_position;", schema, table)

	var structures []Structure
	result := db.Raw(query).Scan(&structures)

	if result.Error != nil {
		return nil, result.Error
	}

	return structures, err
}

func TableSpaces(connectionId int32) ([]string, error) {
	db, err := Connect(connectionId)
	if err != nil {
		return nil, errors.New("Connection error: " + err.Error())
	}

	query := "SELECT spcname FROM pg_tablespace;"

	type tableSpace struct {
		Name string `gorm:"column:spcname"`
	}

	var tablespacesResult []tableSpace
	result := db.Raw(query).Scan(&tablespacesResult)

	if result.Error != nil {
		return nil, result.Error
	}

	var tablespaces []string
	for _, ts := range tablespacesResult {
		tablespaces = append(tablespaces, ts.Name)
	}

	return tablespaces, err
}

func Encodes() []string {
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

func CreateDatabase(dto *dto.DatabaseDto) error {
	query := createDBQuery(dto)

	db, err := Connect(dto.ConnectionId)
	if err != nil {
		return errors.New("Connection error: " + err.Error())
	}

	result := db.Exec(query)

	return result.Error
}

func DropDatabase(dto *dto.DeleteDatabaseDto) error {
	query := fmt.Sprintf("DROP DATABASE %s", dto.Name)

	db, err := Connect(dto.ConnectionId)
	if err != nil {
		return errors.New("Connection error: " + err.Error())
	}

	result := db.Exec(query)

	return result.Error
}
