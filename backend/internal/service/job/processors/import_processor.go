package processors

import (
	"context"
	"encoding/base64"
	"fmt"
	"strings"

	"encoding/json"

	"github.com/blastrain/vitess-sqlparser/sqlparser"
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/internal/service/job"
	"github.com/dbo-studio/dbo/pkg/csv"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

type ImportProcessor struct {
	jobManager     job.IJobManager
	cm             *databaseConnection.ConnectionManager
	connectionRepo repository.IConnectionRepo
}

func NewImportProcessor(jobManager job.IJobManager, cm *databaseConnection.ConnectionManager, connectionRepo repository.IConnectionRepo) *ImportProcessor {
	return &ImportProcessor{
		jobManager:     jobManager,
		cm:             cm,
		connectionRepo: connectionRepo,
	}
}

func (p *ImportProcessor) GetType() model.JobType {
	return model.JobTypeImport
}

func (p *ImportProcessor) Process(job *model.Job) error {
	data, err := helper.ConvertToDTO[dto.ImportJob]([]byte(job.Data))
	if err != nil {
		return fmt.Errorf("could not convert job data to DTO: %v", err)
	}

	var fileData []byte
	if decoded, err := base64.StdEncoding.DecodeString(string(data.Data)); err == nil {
		fileData = decoded
	} else {
		fileData = data.Data
	}

	connection, err := p.connectionRepo.Find(context.Background(), data.ConnectionId)
	if err != nil {
		return err
	}

	repo, err := database.NewDatabaseRepository(connection, p.cm)
	if err != nil {
		return err
	}

	err = p.jobManager.UpdateJobProgress(job, 10, "Connected to database")
	if err != nil {
		return err
	}

	if job.Status == model.JobStatusCancelled {
		return fmt.Errorf("job was cancelled")
	}

	err = p.jobManager.UpdateJobProgress(job, 20, "Starting import process")
	if err != nil {
		return err
	}

	if job.Status == model.JobStatusCancelled {
		return fmt.Errorf("job was cancelled")
	}

	return p.processLargeFile(job, repo, data, fileData)
}

func (p *ImportProcessor) processLargeFile(job *model.Job, dbRepo databaseContract.DatabaseRepository, data dto.ImportJob, fileData []byte) error {
	if job.Status == model.JobStatusCancelled {
		return fmt.Errorf("job was cancelled")
	}

	err := p.jobManager.UpdateJobProgress(job, 30, "Parsing file")
	if err != nil {
		return err
	}

	if job.Status == "cancelled" {
		return fmt.Errorf("job was cancelled")
	}

	var rows [][]string
	var columnNames []string

	switch data.Format {
	case "csv":
		rows, columnNames, err = csv.Reader(string(fileData))
	case "json":
		rows, columnNames, err = parseJSONFile(fileData)
	case "sql":
		rows, columnNames, err = parseSQLFile(fileData)
	default:
		return fmt.Errorf("unsupported file format: %s", data.Format)
	}

	if err != nil {
		return err
	}

	totalRows := len(rows)
	chunkSize := 1000
	chunks := lo.Chunk(rows, chunkSize)
	totalChunks := len(chunks)

	err = p.jobManager.UpdateJobProgress(job, 40, fmt.Sprintf("Starting chunked import - %d rows in %d chunks", totalRows, totalChunks))
	if err != nil {
		return err
	}

	var successRows, failedRows int
	var errors []databaseContract.ImportError

	for i, chunk := range chunks {
		progress := 40 + (i * 50 / totalChunks) // Progress from 40% to 90%
		err = p.jobManager.UpdateJobProgress(job, progress, fmt.Sprintf("Processing chunk %d/%d (%d rows)", i+1, totalChunks, len(chunk)))
		if err != nil {
			return err
		}

		if job.Status == "cancelled" {
			return fmt.Errorf("job was cancelled")
		}

		chunkSuccess, chunkFailed, chunkErrors := p.processChunk(dbRepo, data, columnNames, chunk)
		successRows += chunkSuccess
		failedRows += chunkFailed
		errors = append(errors, chunkErrors...)

		if !data.ContinueOnError && len(chunkErrors) > 0 {
			return fmt.Errorf("import failed at chunk %d: %v", i+1, chunkErrors[0].Message)
		}

		if data.MaxErrors > 0 && len(errors) >= data.MaxErrors {
			return fmt.Errorf("maximum errors reached (%d)", data.MaxErrors)
		}
	}

	err = p.jobManager.UpdateJobProgress(job, 100, "Import completed successfully")
	if err != nil {
		return err
	}

	job.Result = model.JobResult{
		TotalRows:   totalRows,
		SuccessRows: successRows,
		FailedRows:  failedRows,
		Errors:      errors,
		Format:      data.Format,
		TableName:   data.Table,
	}

	return nil
}

func (p *ImportProcessor) processChunk(dbRepo databaseContract.DatabaseRepository, options dto.ImportJob, columnNames []string, rows [][]string) (int, int, []databaseContract.ImportError) {
	var successRows, failedRows int
	var errors []databaseContract.ImportError

	importResult, err := dbRepo.ImportData(options, rows, columnNames)
	if err != nil {
		for i, row := range rows {
			failedRows++
			errors = append(errors, databaseContract.ImportError{
				Row:     i,
				Message: err.Error(),
				Value:   strings.Join(row, ","),
			})

			if !options.ContinueOnError {
				return successRows, failedRows, errors
			}

			if options.MaxErrors > 0 && len(errors) >= options.MaxErrors {
				return successRows, failedRows, errors
			}
		}
	} else {
		successRows = importResult.SuccessRows
		failedRows = importResult.FailedRows
		errors = importResult.Errors
	}

	return successRows, failedRows, errors
}

func parseSQLFile(fileData []byte) ([][]string, []string, error) {
	sql := string(fileData)

	stmt, err := sqlparser.Parse(sql)
	if err != nil {
		panic(err)
	}

	insertStmt, ok := stmt.(*sqlparser.Insert)
	if !ok {
		return nil, nil, fmt.Errorf("not an INSERT statement")
	}

	var columns []string
	for _, col := range insertStmt.Columns {
		columns = append(columns, col.String())
	}

	var rows [][]string
	for _, rowTuple := range insertStmt.Rows.(sqlparser.Values) {
		var row []string
		for _, expr := range rowTuple {
			row = append(row, sqlparser.String(expr))
		}
		rows = append(rows, row)
	}

	return rows, columns, nil
}

func parseJSONFile(fileData []byte) ([][]string, []string, error) {
	var columns []string
	var rows [][]string

	var jsonData []map[string]interface{}
	if err := json.Unmarshal(fileData, &jsonData); err != nil {
		return nil, nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	if len(jsonData) == 0 {
		return nil, nil, fmt.Errorf("empty JSON file")
	}

	for key := range jsonData[0] {
		columns = append(columns, key)
	}

	for _, row := range jsonData {
		var rowData []string
		for _, colName := range columns {
			value := row[colName]
			rowData = append(rowData, fmt.Sprintf("%v", helper.FormatSQLValue(value)))
		}
		rows = append(rows, rowData)
	}

	return rows, columns, nil
}
