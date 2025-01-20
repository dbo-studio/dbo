package pgsqlDriver

import (
	"fmt"
	"github.com/dbo-studio/dbo/internal/app/dto"

	"gorm.io/gorm"
)

type UpdateQueryResult struct {
	Query        []string
	RowsAffected int
}

func (p PostgresQueryEngine) UpdateQuery(dto *dto.UpdateQueryDto) (*UpdateQueryResult, error) {
	db, err := p.Connect(dto.ConnectionId)
	if err != nil {
		return nil, ErrConnection
	}

	queries := updateQueryGenerator(dto)
	queries = append(queries, insertQueryGenerator(dto)...)
	queries = append(queries, deleteQueryGenerator(dto)...)
	rowsAffected := 0
	err = db.Transaction(func(tx *gorm.DB) error {
		for _, query := range queries {
			result := tx.Exec(query)
			if result.Error != nil {
				return ErrorQuery(result.Error, query)
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

func (p PostgresQueryEngine) UpdateDesign(dto *dto.UpdateDesignRequest) (*UpdateQueryResult, error) {
	db, err := p.Connect(dto.ConnectionId)
	if err != nil {
		return nil, ErrConnection
	}

	queries := updateDesignGenerator(dto)
	queries = append(queries, insertToDesignGenerator(dto)...)
	queries = append(queries, deleteFromDesignGenerator(dto)...)

	err = db.Transaction(func(tx *gorm.DB) error {
		for _, query := range queries {
			result := tx.Exec(query)
			if result.Error != nil {
				return ErrorQuery(result.Error, query)
			}

		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return &UpdateQueryResult{
		Query:        queries,
		RowsAffected: 0,
	}, nil
}

func (p PostgresQueryEngine) CreateDatabase(dto *dto.CreateDatabaseRequest) error {
	query := createDBQuery(dto)

	db, err := p.Connect(dto.ConnectionId)
	if err != nil {
		return ErrConnection
	}

	result := db.Exec(query)

	return result.Error
}

func (p PostgresQueryEngine) DropDatabase(dto *dto.DeleteDatabaseRequest) error {
	query := fmt.Sprintf("DROP DATABASE %s", dto.Name)

	db, err := p.Connect(dto.ConnectionId)
	if err != nil {
		return ErrConnection
	}

	result := db.Exec(query)

	return result.Error
}
