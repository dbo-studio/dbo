package processors

import (
	"archive/zip"
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceJob "github.com/dbo-studio/dbo/internal/service/job"
	serviceSecretStore "github.com/dbo-studio/dbo/internal/service/secret_store"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

type ExportProcessor struct {
	jobManager     serviceJob.IJobManager
	cm             *databaseConnection.ConnectionManager
	connectionRepo repository.IConnectionRepo
	cache          cache.Cache
	secrets        serviceSecretStore.ISecretStore
}

func NewExportProcessor(jobManager serviceJob.IJobManager, cm *databaseConnection.ConnectionManager, connectionRepo repository.IConnectionRepo, secrets serviceSecretStore.ISecretStore, appCache cache.Cache) *ExportProcessor {
	return &ExportProcessor{
		jobManager:     jobManager,
		cm:             cm,
		connectionRepo: connectionRepo,
		cache:          appCache,
		secrets:        secrets,
	}
}

func (p *ExportProcessor) GetType() model.JobType {
	return model.JobTypeExport
}

func (p *ExportProcessor) Process(ctx context.Context, job *model.Job) error {
	if ctx.Err() != nil || job.Status == model.JobStatusCancelled {
		return fmt.Errorf("job was canceled")
	}

	jobData, err := helper.ConvertToDTO[dto.ExportJob]([]byte(job.Data))
	if err != nil {
		return err
	}

	ownerID := jobData.OwnerID
	ctx = helper.CtxWithOwnerID(ctx, ownerID)

	connection, err := p.connectionRepo.Find(ctx, jobData.ConnectionID)
	if err != nil {
		return err
	}

	// Pin password in-memory for the whole job so reconnects don't depend on SecretStore TTL.
	if connection.ConnectionType != "sqlite" {
		pw, err := p.secrets.GetConnectionPassword(ctx, ownerID, connection.ID)
		if err != nil {
			return err
		}

		ctx = helper.CtxWithConnectionPassword(ctx, pw)
	}

	repo, err := database.NewDatabaseRepository(ctx, connection, p.cm)
	if err != nil {
		return err
	}

	err = p.jobManager.UpdateJobProgress(ctx, job, 10, "Connected to database")
	if err != nil {
		return err
	}

	targets, err := exportTargets(ctx, p.cache, repo, connection, &jobData)
	if err != nil {
		return err
	}

	// An empty database is a valid backup but nothing to export.
	if len(targets) == 0 {
		return fmt.Errorf("no tables to export")
	}

	zipped := jobData.IsMultiTable() && jobData.Format != "sql"

	var dump *databaseContract.SchemaDump

	if jobData.IsMultiTable() && jobData.Format == "sql" {
		dump, targets, err = schemaDumpFor(ctx, repo, connection.ConnectionType, &jobData, targets)
		if err != nil {
			return err
		}
	}

	filePath, fileName, err := exportFilePath(&jobData, zipped)
	if err != nil {
		return err
	}

	err = p.jobManager.UpdateJobProgress(ctx, job, 20, fmt.Sprintf("Exporting %d table(s)", len(targets)))
	if err != nil {
		return err
	}

	totalRows, columns, tables, err := writeExport(ctx, repo, connection.ConnectionType, &jobData, targets, dump, filePath, zipped, func(i int, name string) {
		msg, _ := json.Marshal(map[string]any{"phase": "table", "done": i + 1, "total": len(targets), "name": name})
		_ = p.jobManager.UpdateJobProgress(ctx, job, 20+70*i/len(targets), string(msg))
	})
	if err != nil {
		_ = os.Remove(filePath)

		return err
	}

	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return fmt.Errorf("failed to get file info: %w", err)
	}

	err = p.jobManager.UpdateJobProgress(ctx, job, 100, "Export completed successfully")
	if err != nil {
		return fmt.Errorf("failed to update progress: %w", err)
	}

	job.Result = model.JobResult{
		FileName:    fileName,
		FilePath:    filePath,
		Size:        fileInfo.Size(),
		Rows:        totalRows,
		Columns:     columns,
		TotalChunks: 1,
		ChunkSize:   totalRows,
		Query:       jobData.Query,
		Tables:      tables,
	}

	return nil
}

// exportTarget is one SELECT whose rows become a table section (sql) or a
// file inside the zip (csv/json).
type exportTarget struct {
	Name  string
	Query string
}

func exportTargets(ctx context.Context, appCache cache.Cache, repo databaseContract.DatabaseRepository, connection *model.Connection, req *dto.ExportJob) ([]exportTarget, error) {
	connectionType := connection.ConnectionType

	if !req.IsMultiTable() {
		return []exportTarget{{Name: req.Table, Query: req.Query}}, nil
	}

	database := lo.EmptyableToPtr(req.Database)
	schema := lo.EmptyableToPtr(req.Schema)

	names := req.Tables

	if req.Scope != dto.ExportScopeTables {
		// Postgres table names are only unique per schema, and the repo lists
		// every schema when none is given.
		if databaseContract.IsPostgresFamily(connectionType) && schema == nil {
			return nil, fmt.Errorf("schema is required to export a postgres %s", req.Scope)
		}

		// The table listing is cached, and a table created since it was cached
		// would be silently left out of a whole-database export or backup.
		for _, prefix := range []string{cache.PostgresQueryCachePrefix(connection.ID), cache.MySQLQueryCachePrefix(connection.ID)} {
			if err := appCache.DeleteByPrefix(ctx, prefix); err != nil {
				return nil, err
			}
		}

		var err error

		names, err = repo.ListTableNames(ctx, database, schema)
		if err != nil {
			return nil, err
		}
	}

	targets := make([]exportTarget, 0, len(names))

	for _, name := range names {
		qualified := databaseCore.QuoteIdent(connectionType, name)
		if schema != nil && databaseContract.IsPostgresFamily(connectionType) {
			qualified = databaseCore.QuoteIdent(connectionType, *schema) + "." + qualified
		}

		targets = append(targets, exportTarget{Name: name, Query: "SELECT * FROM " + qualified})
	}

	return targets, nil
}

func exportFilePath(req *dto.ExportJob, zipped bool) (filePath, fileName string, err error) {
	if req.SavePath != "" {
		if err := helper.ValidateExportSavePath(req.SavePath, true); err != nil {
			return "", "", fmt.Errorf("invalid save path: %w", err)
		}

		if err := os.MkdirAll(filepath.Dir(req.SavePath), 0755); err != nil {
			return "", "", fmt.Errorf("failed to create directory: %w", err)
		}

		return req.SavePath, filepath.Base(req.SavePath), nil
	}

	if err := os.MkdirAll(helper.ExportDir, 0755); err != nil {
		return "", "", fmt.Errorf("failed to create export directory: %w", err)
	}

	label := req.Table

	switch req.Scope {
	case dto.ExportScopeTables:
		label = "tables"
	case dto.ExportScopeSchema:
		label = req.Schema
	case dto.ExportScopeDatabase:
		label = lo.CoalesceOrEmpty(req.Database, "database")
	}

	ext := req.Format
	if zipped {
		ext = "zip"
	}

	fileName = fmt.Sprintf("export_%s_%s.%s", label, time.Now().Format("20060102_150405"), ext)

	return filepath.Join(helper.ExportDir, fileName), fileName, nil
}

// writeExport streams every target into one sql/csv/json file, or into one zip
// entry per target. Only one chunk of rows is held in memory at a time.
func writeExport(ctx context.Context, repo databaseContract.DatabaseRepository, connectionType string, req *dto.ExportJob, targets []exportTarget, dump *databaseContract.SchemaDump, filePath string, zipped bool, onTarget func(i int, name string)) (totalRows, columnCount int, tables []model.JobTableResult, err error) {
	f, err := os.Create(filePath)
	if err != nil {
		return 0, 0, nil, fmt.Errorf("failed to create export file: %w", err)
	}

	defer func() {
		if closeErr := f.Close(); err == nil && closeErr != nil {
			err = closeErr
		}
	}()

	buffered := bufio.NewWriter(f)

	var (
		zw  *zip.Writer
		out io.Writer = buffered
	)

	if zipped {
		zw = zip.NewWriter(buffered)
	} else if req.Format == "sql" {
		if _, err := io.WriteString(buffered, sqlExportHeader()); err != nil {
			return 0, 0, nil, err
		}

		if dump != nil {
			if err := writeStatements(buffered, dump.Preamble); err != nil {
				return 0, 0, nil, err
			}

			if req.WritesSchema() {
				for _, t := range dump.Ordered() {
					if _, err := io.WriteString(buffered, t.Create+"\n\n"); err != nil {
						return 0, 0, nil, err
					}
				}
			}
		}
	}

	for i, target := range targets {
		if !req.WritesData() {
			break
		}

		onTarget(i, target.Name)

		if zipped {
			out, err = zw.Create(target.Name + "." + req.Format)
			if err != nil {
				return 0, 0, nil, err
			}
		}

		tw := newTableWriter(out, req.Format, target.Name, connectionType, req.IsMultiTable(), ddlFor(dump, target.Name))

		err = repo.StreamRawQuery(ctx, &dto.RawQueryRequest{
			ConnectionID: req.ConnectionID,
			Query:        target.Query,
			Database:     lo.EmptyableToPtr(req.Database),
		}, req.ChunkSize, tw.write)
		if err != nil {
			return 0, 0, nil, fmt.Errorf("export %s: %w", target.Name, err)
		}

		if err := tw.finish(); err != nil {
			return 0, 0, nil, err
		}

		totalRows += tw.rows
		tables = append(tables, model.JobTableResult{Name: target.Name, Rows: tw.rows})
		columnCount = tw.columns
	}

	if zw != nil {
		if err := zw.Close(); err != nil {
			return 0, 0, nil, err
		}
	}

	if dump != nil {
		if req.WritesSchema() {
			for _, t := range dump.Ordered() {
				if err := writeStatements(buffered, t.Post); err != nil {
					return 0, 0, nil, err
				}
			}
		}

		if err := writeStatements(buffered, dump.Postamble); err != nil {
			return 0, 0, nil, err
		}
	}

	if err := buffered.Flush(); err != nil {
		return 0, 0, nil, err
	}

	return totalRows, columnCount, tables, nil
}

func writeStatements(w io.Writer, statements []string) error {
	for _, statement := range statements {
		if _, err := io.WriteString(w, statement+"\n"); err != nil {
			return err
		}
	}

	return nil
}

// schemaDumpFor loads table DDL and reorders targets parents-first. Postgres
// needs a schema to dump; without one only data-only exports proceed unordered.
func schemaDumpFor(ctx context.Context, repo databaseContract.DatabaseRepository, connectionType string, req *dto.ExportJob, targets []exportTarget) (*databaseContract.SchemaDump, []exportTarget, error) {
	if databaseContract.IsPostgresFamily(connectionType) && req.Schema == "" {
		if req.WritesSchema() {
			return nil, nil, fmt.Errorf("schema is required to export a postgres schema")
		}

		return &databaseContract.SchemaDump{}, targets, nil
	}

	names := lo.Map(targets, func(t exportTarget, _ int) string { return t.Name })

	dump, err := repo.DumpSchema(ctx, lo.EmptyableToPtr(req.Database), lo.EmptyableToPtr(req.Schema), names)
	if err != nil {
		return nil, nil, err
	}

	byName := lo.KeyBy(targets, func(t exportTarget) string { return t.Name })
	ordered := make([]exportTarget, 0, len(targets))

	for _, t := range dump.Ordered() {
		ordered = append(ordered, byName[t.Name])
		delete(byName, t.Name)
	}

	for _, t := range targets {
		if _, left := byName[t.Name]; left {
			ordered = append(ordered, t)
		}
	}

	return dump, ordered, nil
}

func ddlFor(dump *databaseContract.SchemaDump, table string) *databaseContract.TableDDL {
	if dump == nil {
		return nil
	}

	for i := range dump.Tables {
		if dump.Tables[i].Name == table {
			return &dump.Tables[i]
		}
	}

	return nil
}
