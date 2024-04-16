package pgsql_driver

import (
	"errors"
	"fmt"

	"github.com/khodemobin/dbo/api/dto"
	"gorm.io/gorm"
)

type UpdateQueryResult struct {
	Query        []string
	RowsAffected int
}

func (p *PostgresQueryEngine) UpdateQuery(dto *dto.UpdateQueryDto) (*UpdateQueryResult, error) {
	db, err := p.Connect(dto.ConnectionId)
	if err != nil {
		return nil, errors.New("Connection error: " + err.Error())
	}

	queries := p.updateQueryGenerator(dto)
	queries = append(queries, p.insertQueryGenerator(dto)...)
	queries = append(queries, p.deleteQueryGenerator(dto)...)
	rowsAffected := 0
	err = db.Transaction(func(tx *gorm.DB) error {
		for _, query := range queries {
			result := tx.Exec(query)
			if result.Error != nil {
				return errors.New("Error on " + query + " " + result.Error.Error())
			}

			rowsAffected += int(result.RowsAffected)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return &UpdateQueryResult{
		Query:        queries,
		RowsAffected: rowsAffected,
	}, nil
}

func (p *PostgresQueryEngine) UpdateDesign(dto *dto.DesignDto) (*UpdateQueryResult, error) {
	db, err := p.Connect(dto.ConnectionId)
	if err != nil {
		return nil, errors.New("Connection error: " + err.Error())
	}

	queries := p.updateDesignGenerator(dto)
	rowsAffected := 0
	err = db.Transaction(func(tx *gorm.DB) error {
		for _, query := range queries {
			result := tx.Exec(query)
			if result.Error != nil {
				return errors.New("Error on " + query + " " + result.Error.Error())
			}

			rowsAffected += int(result.RowsAffected)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return &UpdateQueryResult{
		Query:        queries,
		RowsAffected: rowsAffected,
	}, nil
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
