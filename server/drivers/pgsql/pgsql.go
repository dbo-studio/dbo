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

func RunQuery(req *dto.RunQueryDto) (*RunQueryResult, error) {
	query, err := queryGenerator(req)
	if err != nil {
		return nil, errors.New("Generate query error: " + err.Error())
	}

	db, err := Connect(req.ConnectionId)
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

func Databases(connectionId int32) ([]string, error) {
	db, err := Connect(connectionId)
	if err != nil {
		return nil, errors.New("Connection error: " + err.Error())
	}
	query := "SELECT datname FROM pg_database WHERE datistemplate = false;"

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
