package processors

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	databasePostgres "github.com/dbo-studio/dbo/internal/database/postgres"
	databaseSqlite "github.com/dbo-studio/dbo/internal/database/sqlite"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/internal/service/job"
	helper "github.com/dbo-studio/dbo/pkg/helper"
)

type ExportProcessor struct {
	jobManager     job.IJobManager
	cm             *databaseConnection.ConnectionManager
	connectionRepo repository.IConnectionRepo
}

func NewExportProcessor(jobManager job.IJobManager, cm *databaseConnection.ConnectionManager, connectionRepo repository.IConnectionRepo) *ExportProcessor {
	return &ExportProcessor{
		jobManager:     jobManager,
		cm:             cm,
		connectionRepo: connectionRepo,
	}
}

func (p *ExportProcessor) GetType() model.JobType {
	return model.JobTypeExport
}

func (p *ExportProcessor) Process(job *model.Job) error {
	data, err := helper.ConvertToDTO[dto.ExportRequest]([]byte(job.Data))
	if err != nil {
		return fmt.Errorf("could not convert job data to DTO: %v", err)
	}

	// Get connection
	connection, err := p.connectionRepo.Find(context.Background(), data.ConnectionId)
	if err != nil {
		return fmt.Errorf("failed to get connection: %w", err)
	}

	repo, err := database.NewDatabaseRepository(connection, p.cm)
	if err != nil {
		return err
	}

	// Update progress
	err = p.jobManager.UpdateJobProgress(job, 10, "Connected to database")
	if err != nil {
		return fmt.Errorf("failed to update progress: %w", err)
	}

	// Check if job was cancelled
	if job.Status == "cancelled" {
		return fmt.Errorf("job was cancelled")
	}

	// Update progress
	err = p.jobManager.UpdateJobProgress(job, 20, "Analyzing query")
	if err != nil {
		return fmt.Errorf("failed to update progress: %w", err)
	}

	// Use database repository to get export data
	exportResult, err := repo.ExportData(data.Query, data.Format, data.ChunkSize)
	if err != nil {
		return fmt.Errorf("failed to get export data: %w", err)
	}

	// Check if job was cancelled
	if job.Status == "cancelled" {
		return fmt.Errorf("job was cancelled")
	}

	// Update progress
	err = p.jobManager.UpdateJobProgress(job, 30, fmt.Sprintf("Found %d rows to export", exportResult.TotalRows))
	if err != nil {
		return fmt.Errorf("failed to update progress: %w", err)
	}

	// Calculate total chunks
	totalChunks := (exportResult.TotalRows + data.ChunkSize - 1) / data.ChunkSize

	// Determine file path
	var filePath string
	var fileName string
	if data.SavePath != "" {
		// Desktop mode: use provided save path
		filePath = data.SavePath
		fileName = filepath.Base(data.SavePath)
		// Ensure directory exists
		dir := filepath.Dir(data.SavePath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("failed to create directory: %w", err)
		}
	} else {
		// Web mode: use default exports directory
		exportDir := "exports"
		if err := os.MkdirAll(exportDir, 0755); err != nil {
			return fmt.Errorf("failed to create export directory: %w", err)
		}
		timestamp := time.Now().Format("20060102_150405")
		fileName = fmt.Sprintf("export_%s.%s", timestamp, data.Format)
		filePath = filepath.Join(exportDir, fileName)
	}

	// Create file
	file, err := os.Create(filePath)
	if err != nil {
		return fmt.Errorf("failed to create export file: %w", err)
	}
	defer file.Close()

	// Process data in chunks using database repository
	processedRows := 0
	var allData []map[string]interface{}
	var columns []string

	for chunk := 0; chunk < totalChunks; chunk++ {
		// Check if job was cancelled
		if job.Status == "cancelled" {
			return fmt.Errorf("job was cancelled")
		}

		// Update progress
		progress := 30 + (chunk * 60 / totalChunks)
		err = p.jobManager.UpdateJobProgress(job, progress, fmt.Sprintf("Processing chunk %d/%d", chunk+1, totalChunks))
		if err != nil {
			return fmt.Errorf("failed to update progress: %w", err)
		}

		// Get chunk data from database repository
		chunkData, chunkColumns, err := p.getChunkData(repo, data.Query, chunk*data.ChunkSize, data.ChunkSize)
		if err != nil {
			return fmt.Errorf("failed to get chunk data %d: %w", chunk+1, err)
		}

		// Store columns from first chunk
		if len(columns) == 0 {
			columns = chunkColumns
		}

		// Add chunk data to all data
		allData = append(allData, chunkData...)
		processedRows += len(chunkData)
	}

	// Check if job was cancelled
	if job.Status == "cancelled" {
		return fmt.Errorf("job was cancelled")
	}

	// Update progress
	err = p.jobManager.UpdateJobProgress(job, 90, "Creating export file")
	if err != nil {
		return fmt.Errorf("failed to update progress: %w", err)
	}

	// Generate file content based on format
	var fileContent []byte
	switch data.Format {
	case "sql":
		fileContent = p.generateSQLExportFromData(data.Table, columns, allData)
	case "json":
		fileContent, err = json.MarshalIndent(allData, "", "  ")
		if err != nil {
			return fmt.Errorf("failed to marshal JSON: %w", err)
		}
	case "csv":
		fileContent = p.generateCSVExportFromData(columns, allData)
	default:
		return fmt.Errorf("unsupported format: %s", data.Format)
	}

	if err := os.WriteFile(filePath, fileContent, 0644); err != nil {
		return fmt.Errorf("failed to write export file: %w", err)
	}

	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return fmt.Errorf("failed to get file info: %w", err)
	}

	err = p.jobManager.UpdateJobProgress(job, 100, "Export completed successfully")
	if err != nil {
		return fmt.Errorf("failed to update progress: %w", err)
	}

	job.Result = model.JobResult{
		FileName:    fileName,
		FilePath:    filePath,
		Size:        fileInfo.Size(),
		Rows:        processedRows,
		Columns:     len(columns),
		TotalChunks: totalChunks,
		ChunkSize:   data.ChunkSize,
		Query:       data.Query,
	}

	return nil
}

func (p *ExportProcessor) processChunk(rows *sql.Rows, columns []string) []map[string]interface{} {
	var chunkData []map[string]interface{}

	for rows.Next() {
		row := make([]interface{}, len(columns))
		rowPtrs := make([]interface{}, len(columns))
		for i := range row {
			rowPtrs[i] = &row[i]
		}

		if err := rows.Scan(rowPtrs...); err != nil {
			continue
		}

		rowMap := make(map[string]interface{})
		for i, col := range columns {
			rowMap[col] = row[i]
		}
		chunkData = append(chunkData, rowMap)
	}

	return chunkData
}

func (p *ExportProcessor) generateSQLExportFromData(tableName string, columns []string, data []map[string]interface{}) []byte {
	var sql strings.Builder

	// Create table statement (simplified)
	sql.WriteString("-- Export Data\n")
	sql.WriteString("-- Generated on: " + time.Now().Format("2006-01-02 15:04:05") + "\n\n")

	// Insert statements
	if len(data) > 0 {
		// Include column names in the INSERT statement
		sql.WriteString(fmt.Sprintf("INSERT INTO %s (", tableName))
		for i, col := range columns {
			sql.WriteString(col)
			if i < len(columns)-1 {
				sql.WriteString(", ")
			}
		}
		sql.WriteString(") VALUES\n")

		for i, row := range data {
			sql.WriteString("(")
			for j, col := range columns {
				value := row[col]

				if value == nil {
					sql.WriteString("NULL")
				} else {
					sql.WriteString(helper.FormatSQLValue(value))
				}

				if j < len(columns)-1 {
					sql.WriteString(", ")
				}
			}
			sql.WriteString(")")
			if i < len(data)-1 {
				sql.WriteString(",\n")
			} else {
				sql.WriteString(";\n")
			}
		}
	}

	return []byte(sql.String())
}

func (p *ExportProcessor) generateCSVExportFromData(columns []string, data []map[string]interface{}) []byte {
	var csv strings.Builder

	// Header
	for i, col := range columns {
		csv.WriteString(col)
		if i < len(columns)-1 {
			csv.WriteString(",")
		}
	}
	csv.WriteString("\n")

	// Data rows
	for _, row := range data {
		for i, col := range columns {
			value := row[col]

			if value != nil {
				// Escape quotes in CSV
				strValue := fmt.Sprintf("%v", value)
				if strings.Contains(strValue, ",") || strings.Contains(strValue, "\"") || strings.Contains(strValue, "\n") {
					strValue = fmt.Sprintf("\"%s\"", strings.ReplaceAll(strValue, "\"", "\"\""))
				}
				csv.WriteString(strValue)
			}

			if i < len(columns)-1 {
				csv.WriteString(",")
			}
		}
		csv.WriteString("\n")
	}

	return []byte(csv.String())
}

func (p *ExportProcessor) getChunkData(dbRepo databaseContract.DatabaseRepository, query string, offset, limit int) ([]map[string]interface{}, []string, error) {
	// Type assertion to get the specific repository methods
	switch repo := dbRepo.(type) {
	case *databasePostgres.PostgresRepository:
		return repo.GetExportData(query, offset, limit)
	case *databaseSqlite.SQLiteRepository:
		return repo.GetExportData(query, offset, limit)
	default:
		return nil, nil, fmt.Errorf("unsupported repository type")
	}
}
