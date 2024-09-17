package pgsqlDriver

import (
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/api/dto"
	error_c "github.com/dbo-studio/dbo/error"
	"github.com/dbo-studio/dbo/helper"
	"github.com/xwb1989/sqlparser"
)

type RunQueryResult struct {
	Query string
	Data  []map[string]interface{}
}

func (p PostgresQueryEngine) RunQuery(dto *dto.RunQueryDto) (*RunQueryResult, error) {
	query := queryGenerator(dto)

	db, err := p.Connect(dto.ConnectionId)
	if err != nil {
		return nil, error_c.ErrConnection
	}

	queryResults := make([]map[string]interface{}, 0)
	result := db.Raw(query).Find(&queryResults)
	if result.Error != nil {
		return nil, result.Error
	}

	for i := range queryResults {
		queryResults[i]["dbo_index"] = i
	}

	p.DBLogger(query)
	return &RunQueryResult{
		Query: query,
		Data:  queryResults,
	}, nil
}

type RawQueryResult struct {
	Query    string
	Data     []map[string]interface{}
	Columns  []Structure
	IsQuery  bool
	Duration string
}

func (p PostgresQueryEngine) RawQuery(dto *dto.RawQueryDto) (*RawQueryResult, error) {
	db, err := p.Connect(dto.ConnectionId)
	if err != nil {
		return nil, error_c.ErrConnection
	}

	startTime := time.Now()
	queryResults := make([]map[string]interface{}, 0)

	rows, err := db.Raw(dto.Query).Rows()
	if err != nil {
		return &RawQueryResult{
			Query:    dto.Query,
			Data:     queryResults,
			IsQuery:  isQuery(dto.Query, queryResults),
			Duration: "0",
		}, err
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	columnTypes, err := rows.ColumnTypes()
	if err != nil {
		return nil, err
	}

	for rows.Next() {
		var data map[string]interface{}
		err := db.ScanRows(rows, &data)
		if err != nil {
			return nil, err
		}
		queryResults = append(queryResults, data)
	}

	endTime := time.Since(startTime)

	for i := range queryResults {
		queryResults[i]["dbo_index"] = i
		queryResults[i]["editable"] = false
	}

	structures := make([]Structure, 0)

	for i, column := range columns {
		structures = append(structures, Structure{
			ColumnName: column,
			DataType:   strings.ToLower(columnTypes[i].DatabaseTypeName()),
			MappedType: columnMappedFormat(columnTypes[i].Name()),
		})
	}

	p.DBLogger(dto.Query)

	return &RawQueryResult{
		Query:    dto.Query,
		Data:     queryResults,
		Columns:  structures,
		IsQuery:  isQuery(dto.Query, queryResults),
		Duration: helper.FloatToString(endTime.Seconds()),
	}, nil
}

func (p PostgresQueryEngine) Version(connectionId int32) (string, error) {
	db, err := p.Connect(connectionId)
	if err != nil {
		return "", error_c.ErrConnection
	}

	var version string
	result := db.Raw("SELECT version()").Scan(&version)
	version = strings.Split(version, " ")[1]

	return version, result.Error
}

func (p PostgresQueryEngine) Databases(connectionId int32, withTemplates bool) ([]string, error) {
	db, err := p.Connect(connectionId)
	if err != nil {
		return nil, error_c.ErrConnection
	}

	query := "SELECT datname FROM pg_database"
	if !withTemplates {
		query += " WHERE datistemplate = false;"
	}

	type Database struct {
		Name string `gorm:"column:datname"`
	}

	databases := make([]Database, 0)
	result := db.Raw(query).Find(&databases)

	var names []string
	for _, v := range databases {
		names = append(names, v.Name)
	}

	return names, result.Error
}

func (p PostgresQueryEngine) Schemas(connectionId int32, database string, all bool) ([]string, error) {
	db, err := p.Connect(connectionId)
	if err != nil {
		return nil, error_c.ErrConnection
	}
	query := "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema') " + fmt.Sprintf("AND catalog_name = '%s'", database)
	if !all {
		query += " AND schema_name NOT LIKE 'pg_%';"
	}

	type Schema struct {
		Name string `gorm:"column:schema_name"`
	}

	schemas := make([]Schema, 0)
	result := db.Raw(query).Find(&schemas)

	names := make([]string, 0)
	for _, v := range schemas {
		names = append(names, v.Name)
	}

	return names, result.Error
}

func (p PostgresQueryEngine) Tables(connectionId int32, schema string) ([]string, error) {
	db, err := p.Connect(connectionId)
	if err != nil {
		return nil, error_c.ErrConnection
	}

	query := fmt.Sprintf("SELECT n.nspname AS schema_name,t.tablename AS table_name FROM pg_namespace n LEFT JOIN pg_tables t ON n.nspname=t.schemaname::name WHERE n.nspname = '%s' ORDER BY schema_name,table_name;", schema)

	type Info struct {
		TableName sql.NullString `gorm:"column:table_name"`
	}

	info := make([]Info, 0)
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

func (p PostgresQueryEngine) Columns(connectionId int32, table string, schema string) ([]string, error) {
	columns := make([]string, 0)
	structures, err := p.TableStructure(connectionId, table, schema, false)
	if err != nil {
		return columns, err
	}

	for _, structure := range structures {
		columns = append(columns, structure.ColumnName)
	}

	return columns, nil
}

func (p PostgresQueryEngine) Views(connectionId int32) ([]string, error) {
	db, err := p.Connect(connectionId)
	if err != nil {
		return nil, error_c.ErrConnection
	}

	query := "SELECT schemaname,viewname FROM pg_catalog.pg_views WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY schemaname,viewname;"

	type Info struct {
		ViewName sql.NullString `gorm:"column:viewname"`
	}

	info := make([]Info, 0)
	result := db.Raw(query).Find(&info)

	if result.Error != nil {
		return nil, result.Error
	}

	var views []string
	for _, view := range info {
		if !view.ViewName.Valid {
			continue
		}

		views = append(views, view.ViewName.String)
	}

	return views, err
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
	Editable               bool           `gorm:"_:"`
	IsActive               bool           `gorm:"_:"`
}

func (p PostgresQueryEngine) TableStructure(connectionId int32, table string, schema string, editable bool) ([]Structure, error) {
	db, err := p.Connect(connectionId)
	if err != nil {
		return nil, error_c.ErrConnection
	}

	query := fmt.Sprintf("SELECT cols.ordinal_position,cols.column_name,cols.data_type,cols.is_nullable,cols.column_default,cols.character_maximum_length,des.description AS column_comment FROM information_schema.columns AS cols LEFT JOIN pg_catalog.pg_description AS des ON(des.objoid=(SELECT c.oid FROM pg_catalog.pg_class AS c WHERE c.relname=cols.table_name)AND des.objsubid=cols.ordinal_position)WHERE cols.table_schema='%s' AND cols.table_name='%s' ORDER BY cols.ordinal_position;", schema, table)

	structures := make([]Structure, 0)
	result := db.Raw(query).Find(&structures)

	for i, structure := range structures {
		structures[i].MappedType = columnMappedFormat(structure.DataType)
		structures[i].DataType = columnAliases(structure.DataType)
		structures[i].Editable = editable
		structures[i].IsActive = true
	}

	if result.Error != nil {
		return nil, result.Error
	}

	return structures, err
}

func (p PostgresQueryEngine) TableSpaces(connectionId int32) ([]string, error) {
	db, err := p.Connect(connectionId)
	if err != nil {
		return nil, error_c.ErrConnection
	}

	query := "SELECT spcname FROM pg_tablespace;"

	type tableSpace struct {
		Name string `gorm:"column:spcname"`
	}

	tablespacesResult := make([]tableSpace, 0)
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

type IndexInfo struct {
	IndexName       string  `db:"index_name"`
	IndexAlgorithm  string  `db:"index_algorithm"`
	IsUnique        bool    `db:"is_unique"`
	IndexDefinition string  `db:"index_definition"`
	ColumnName      string  `db:"column_name"`
	Condition       string  `db:"condition"`
	Comment         *string `db:"comment"`
}

func (p PostgresQueryEngine) Indexes(connectionId int32, table string, schema string) ([]IndexInfo, error) {
	db, err := p.Connect(connectionId)
	if err != nil {
		return nil, error_c.ErrConnection
	}

	query := fmt.Sprintf(`SELECT ix.relname AS index_name,upper(am.amname)AS index_algorithm,indisunique AS is_unique,pg_get_indexdef(indexrelid)AS index_definition,REPLACE(regexp_replace(regexp_replace(pg_get_indexdef(indexrelid),' WHERE .+',''),'.*\((.*)\)','\1'),' ','')AS column_name,CASE WHEN position(' WHERE ' IN pg_get_indexdef(indexrelid))>0 THEN regexp_replace(pg_get_indexdef(indexrelid),'.+WHERE ','')ELSE'' END AS condition,pg_catalog.obj_description(i.indexrelid,'pg_class')AS COMMENT FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid JOIN pg_class ix ON ix.oid=i.indexrelid JOIN pg_namespace n ON t.relnamespace=n.oid JOIN pg_am AS am ON ix.relam=am.oid WHERE t.relname='%s' AND n.nspname='%s';`, table, schema)

	indexes := []IndexInfo{}
	result := db.Raw(query).Find(&indexes)

	if result.Error != nil {
		return nil, result.Error
	}

	return indexes, nil
}

func (p PostgresQueryEngine) Encodes() []string {
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

func (p PostgresQueryEngine) DataTypes() []string {
	return []string{
		"bigserial",
		"bit",
		"bool",
		"box",
		"bytea",
		"char",
		"cidr",
		"circle",
		"date",
		"decimal",
		"float4",
		"float8",
		"inet",
		"int2",
		"int4",
		"int8",
		"interval",
		"json",
		"jsonb",
		"line",
		"lseg",
		"macaddr",
		"money",
		"numeric",
		"path",
		"point",
		"polygon",
		"serial",
		"serial2",
		"serial4",
		"serial8",
		"smallserial",
		"text",
		"time",
		"timestamp",
		"timestamptz",
		"timetz",
		"tsquery",
		"tsvector",
		"txid_snapshot",
		"uuid",
		"varbit",
		"varchar",
		"xml",
	}
}

// convert pgsql type to simple types for fronted
func columnMappedFormat(dataType string) string {
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

func columnAliases(dataType string) string {
	switch dataType {
	case "character varying":
		return "varchar"
	case "varchar":
		return "character varying"
	case "timestamp":
		return "timestamp without time zone"
	case "timestamptz":
		return "timestamp with time zone"
	case "int2":
		return "smallint"
	case "int4":
		return "integer"
	case "int8":
		return "bigint"
	case "float4":
		return "real"
	case "float8":
		return "double precision"
	case "time":
		return "time without time zone"
	case "timetz":
		return "time with time zone"
	default:
		return dataType
	}
}

func isQuery(query string, queryResult []map[string]interface{}) bool {
	stmt, err := sqlparser.Parse(query)
	if err != nil {
		return len(queryResult) > 0
	}

	switch smtType := stmt.(type) {
	case *sqlparser.Select:
		log.Println(smtType)
		return true
	}

	return false
}
