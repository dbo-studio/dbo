package serviceSchema

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/sqlguard"
	"github.com/samber/lo"
)

const (
	// maxUndoRows caps the rows a data change may touch and still be undone.
	maxUndoRows = 200
	// maxTrackedKeys caps the keys read to find the rows an INSERT adds.
	maxTrackedKeys = 10000
)

// WriteCapture is what a data change touches, read before it runs, so it can be undone after.
// Note says why it cannot be undone when that is the case.
type WriteCapture struct {
	target  sqlguard.WriteTarget
	keys    []string
	columns []string
	before  []map[string]any
	keySet  map[string]bool
	Note    string
}

func (s *ISchemaServiceImpl) undoRepo(ctx context.Context, connectionID int32) (string, contract.DatabaseRepository, error) {
	connection, err := s.connectionRepo.Find(ctx, connectionID)
	if err != nil {
		return "", nil, err
	}

	repo, err := database.NewDatabaseRepository(ctx, connection, s.cm)

	return connection.ConnectionType, repo, err
}

// CaptureWrite reads what a data change will touch before it runs.
func (s *ISchemaServiceImpl) CaptureWrite(ctx context.Context, req *dto.WritePreviewRequest) *WriteCapture {
	target, ok := sqlguard.ParseWriteTarget(req.SQL)
	if !ok {
		return &WriteCapture{Note: "the statement could not be read to prepare an undo"}
	}

	capture := &WriteCapture{target: target}

	_, repo, err := s.undoRepo(ctx, req.ConnectionID)
	if err != nil {
		capture.Note = err.Error()
		return capture
	}

	structure, err := repo.TableStructure(ctx, target.Table, req.Database, req.Schema)
	if err != nil {
		capture.Note = "the table could not be read"
		return capture
	}

	capture.keys = lo.FilterMap(structure.Columns, func(column contract.StructureColumn, _ int) (string, bool) {
		return column.Name, column.IsPrimaryKey
	})
	if len(capture.keys) == 0 && target.Kind != "DELETE" {
		capture.Note = "the table has no primary key"
		return capture
	}

	if target.Kind == "UPDATE" && lo.SomeBy(target.SetColumns, func(column string) bool { return lo.Contains(capture.keys, column) }) {
		capture.Note = "the change rewrites the primary key"
		return capture
	}

	switch target.Kind {
	case "INSERT":
		capture.keySet, capture.Note = s.readKeys(ctx, repo, req, target.Table, capture.keys)
	default:
		query, ok := sqlguard.SampleQuery(req.SQL, maxUndoRows+1)
		if !ok {
			capture.Note = "the rows it touches could not be read"
			return capture
		}

		result, err := repo.RunRawQuery(ctx, &contract.RawQueryRequest{ConnectionID: req.ConnectionID, Query: query, Database: req.Database, Schema: req.Schema})
		if err != nil {
			capture.Note = "the rows it touches could not be read"
			return capture
		}

		if len(result.Data) > maxUndoRows {
			capture.Note = fmt.Sprintf("it touches more than %d rows", maxUndoRows)
			return capture
		}

		capture.before = result.Data
		capture.columns = lo.Map(result.Columns, func(column contract.Column, _ int) string { return column.Name })
	}

	return capture
}

func (s *ISchemaServiceImpl) readKeys(
	ctx context.Context,
	repo contract.DatabaseRepository,
	req *dto.WritePreviewRequest,
	table string,
	keys []string,
) (map[string]bool, string) {
	result, err := repo.RunRawQuery(ctx, &contract.RawQueryRequest{
		ConnectionID: req.ConnectionID,
		Query:        fmt.Sprintf("SELECT %s FROM %s LIMIT %d", strings.Join(keys, ", "), table, maxTrackedKeys+1),
		Database:     req.Database,
		Schema:       req.Schema,
	})
	if err != nil {
		return nil, "the table's keys could not be read"
	}

	if len(result.Data) > maxTrackedKeys {
		return nil, fmt.Sprintf("the table has more than %d rows to compare", maxTrackedKeys)
	}

	set := make(map[string]bool, len(result.Data))
	for _, row := range result.Data {
		set[keyOf(row, keys)] = true
	}

	return set, ""
}

// WriteUndo builds the one statement that takes an applied data change back, or says why there is none.
func (s *ISchemaServiceImpl) WriteUndo(ctx context.Context, req *dto.WritePreviewRequest, capture *WriteCapture) (string, string) {
	if capture.Note != "" {
		return "", capture.Note
	}

	connectionType, repo, err := s.undoRepo(ctx, req.ConnectionID)
	if err != nil {
		return "", err.Error()
	}

	table := qualifiedTable(connectionType, lo.FromPtr(req.Database), lo.FromPtr(req.Schema), capture.target.Table)
	ident := func(name string) string { return identifier(connectionType, name) }

	match := func(row map[string]any) (string, bool) {
		parts := make([]string, 0, len(capture.keys))
		for _, key := range capture.keys {
			value, ok := literal(connectionType, row[key])
			if !ok {
				return "", false
			}

			parts = append(parts, ident(key)+" = "+value)
		}

		return "(" + strings.Join(parts, " AND ") + ")", true
	}

	switch capture.target.Kind {
	case "INSERT":
		after, note := s.readKeys(ctx, repo, req, capture.target.Table, capture.keys)
		if note != "" {
			return "", note
		}

		var predicates []string

		for key := range after {
			if capture.keySet[key] {
				continue
			}

			predicate, ok := match(decodeKey(key, capture.keys))
			if !ok {
				return "", "a key value could not be written back"
			}

			predicates = append(predicates, predicate)
		}

		switch {
		case len(predicates) == 0:
			return "", "it added no rows"
		case len(predicates) > maxUndoRows:
			return "", fmt.Sprintf("it added more than %d rows", maxUndoRows)
		}

		return "DELETE FROM " + table + " WHERE " + strings.Join(predicates, " OR "), ""
	case "DELETE":
		if len(capture.before) == 0 {
			return "", "it removed no rows"
		}

		rows := make([]string, 0, len(capture.before))
		for _, row := range capture.before {
			values := make([]string, 0, len(capture.columns))
			for _, column := range capture.columns {
				value, ok := literal(connectionType, row[column])
				if !ok {
					return "", fmt.Sprintf("the value of %s could not be written back", column)
				}

				values = append(values, value)
			}

			rows = append(rows, "("+strings.Join(values, ", ")+")")
		}

		columns := lo.Map(capture.columns, func(column string, _ int) string { return ident(column) })

		return "INSERT INTO " + table + " (" + strings.Join(columns, ", ") + ") VALUES " + strings.Join(rows, ", "), ""
	default:
		if len(capture.before) == 0 {
			return "", "it changed no rows"
		}

		predicates := make([]string, 0, len(capture.before))
		sets := make([]string, 0, len(capture.target.SetColumns))

		for _, row := range capture.before {
			predicate, ok := match(row)
			if !ok {
				return "", "a key value could not be written back"
			}

			predicates = append(predicates, predicate)
		}

		for _, column := range capture.target.SetColumns {
			cases := make([]string, 0, len(capture.before))
			for i, row := range capture.before {
				value, ok := literal(connectionType, row[column])
				if !ok {
					return "", fmt.Sprintf("the value of %s could not be written back", column)
				}

				cases = append(cases, "WHEN "+predicates[i]+" THEN "+value)
			}

			sets = append(sets, ident(column)+" = CASE "+strings.Join(cases, " ")+" ELSE "+ident(column)+" END")
		}

		return "UPDATE " + table + " SET " + strings.Join(sets, ", ") + " WHERE " + strings.Join(predicates, " OR "), ""
	}
}

func qualifiedTable(connectionType, database, schema, table string) string {
	switch {
	case contract.IsPostgresFamily(connectionType):
		return identifier(connectionType, lo.CoalesceOrEmpty(schema, "public")) + "." + identifier(connectionType, table)
	case contract.IsMysqlFamily(connectionType) && database != "":
		return identifier(connectionType, database) + "." + identifier(connectionType, table)
	default:
		return identifier(connectionType, table)
	}
}

// literal writes a value read from the database back as SQL. Binary values and
// anything unknown are refused rather than guessed.
func literal(connectionType string, value any) (string, bool) {
	switch v := value.(type) {
	case nil:
		return "NULL", true
	case bool:
		return strings.ToUpper(strconv.FormatBool(v)), true
	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
		return fmt.Sprintf("%d", v), true
	case float32, float64:
		return fmt.Sprintf("%v", v), true
	case time.Time:
		return quoteString(connectionType, v.Format("2006-01-02 15:04:05.999999")), true
	case string:
		return quoteString(connectionType, v), true
	default:
		return "", false
	}
}

func quoteString(connectionType, value string) string {
	escaped := strings.ReplaceAll(value, "'", "''")
	if contract.IsMysqlFamily(connectionType) {
		escaped = strings.ReplaceAll(escaped, `\`, `\\`)
	}

	return "'" + escaped + "'"
}

// keyOf joins a row's key values into a map key; decodeKey reads it back.
func keyOf(row map[string]any, keys []string) string {
	parts := make([]string, 0, len(keys))
	for _, key := range keys {
		parts = append(parts, fmt.Sprintf("%T\x1f%v", row[key], row[key]))
	}

	return strings.Join(parts, "\x1e")
}

func decodeKey(key string, keys []string) map[string]any {
	row := map[string]any{}

	for i, part := range strings.Split(key, "\x1e") {
		kind, value, _ := strings.Cut(part, "\x1f")

		switch {
		case strings.HasPrefix(kind, "int") || strings.HasPrefix(kind, "uint"):
			n, _ := strconv.ParseInt(value, 10, 64)
			row[keys[i]] = n
		case strings.HasPrefix(kind, "float"):
			f, _ := strconv.ParseFloat(value, 64)
			row[keys[i]] = f
		case kind == "<nil>":
			row[keys[i]] = nil
		default:
			row[keys[i]] = value
		}
	}

	return row
}
