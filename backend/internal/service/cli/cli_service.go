// Package serviceCLI runs terminal lines against SQL and NoSQL connections. It adds no database capability:
// every line goes through the same Safe Mode, history and driver paths as the editors. It only adds the
// terminal permission, extra blocks for host-escaping SQL, a hard timeout, and an audit log.
package serviceCLI

import (
	"context"
	"errors"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceNoSQL "github.com/dbo-studio/dbo/internal/service/nosql"
	serviceQuery "github.com/dbo-studio/dbo/internal/service/query"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/logger"
)

// cliTimeout bounds one line. The editor can move slow queries to the background; a terminal cannot.
const cliTimeout = 30 * time.Second

// ErrHostEscape is returned for SQL that reaches the database host (files, programs) instead of data.
var ErrHostEscape = errors.New("this statement can reach the database host and is not allowed in the terminal")

// hostEscape matches statements that read or write server files, run programs, or load code. The SQL editor
// is the place for deliberate use of these under Safe Mode; the terminal refuses them outright.
var hostEscape = regexp.MustCompile(`(?is)\b(copy\b[^;]*\b(to|from)\s+program|pg_read_(binary_)?file|pg_ls_dir|pg_stat_file|lo_(import|export)|load_file\s*\(|into\s+(out|dump)file|xp_cmdshell|load\s+data\s+(local\s+)?infile|attach\s+database|load_extension|create\s+(or\s+replace\s+)?(function|procedure)[^;]*\blanguage\s+(plpython|plperl|c)\b)`)

// ErrBusy is returned while the same user already has a statement running.
var ErrBusy = errors.New("a statement is already running; wait for it or press Ctrl+C")

type ICLIService interface {
	Run(ctx context.Context, req *dto.CliRunRequest) (*dto.CliResult, error)
}

type Service struct {
	connectionRepo repository.IConnectionRepo
	queries        serviceQuery.IQueryService
	nosql          serviceNoSQL.INoSQLService
	logger         logger.Logger

	mu      sync.Mutex
	running map[string]struct{}
}

func NewService(cr repository.IConnectionRepo, q serviceQuery.IQueryService, n serviceNoSQL.INoSQLService, l logger.Logger) *Service {
	return &Service{connectionRepo: cr, queries: q, nosql: n, logger: l, running: map[string]struct{}{}}
}

var _ ICLIService = (*Service)(nil)

func (s *Service) Run(ctx context.Context, req *dto.CliRunRequest) (*dto.CliResult, error) {
	if err := helper.RequirePermission(ctx, helper.PermCli); err != nil {
		return nil, err
	}

	// One statement in flight per user: a terminal is serial, and this keeps a script loop from fanning out.
	owner := helper.CtxOwnerID(ctx)

	s.mu.Lock()
	if _, busy := s.running[owner]; busy {
		s.mu.Unlock()

		return nil, apperror.BadRequest(ErrBusy)
	}

	s.running[owner] = struct{}{}
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		delete(s.running, owner)
		s.mu.Unlock()
	}()

	connection, err := s.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	ctx, cancel := context.WithTimeout(ctx, cliTimeout)
	defer cancel()

	// Audit before running: the line is recorded even when it is rejected or fails. Statement text is truncated
	// and never logged for NoSQL, where lines such as AUTH or CONFIG SET carry secrets.
	nosql := databaseContract.IsNoSQL(connection.ConnectionType)
	s.audit(ctx, connection.ID, connection.ConnectionType, req.Input, nosql)

	if nosql {
		res, err := s.nosql.RunCommand(ctx, &dto.NoSQLCommandRequest{ConnectionID: req.ConnectionID, Input: req.Input, Confirmed: req.Confirmed})
		if err != nil {
			return nil, err
		}

		return &dto.CliResult{Kind: "value", Output: res.Output, Engine: "nosql"}, nil
	}

	if hostEscape.MatchString(req.Input) {
		return nil, apperror.Forbidden(ErrHostEscape)
	}

	limit, page := dto.CliRowLimit, 1

	resp, err := s.queries.Raw(ctx, &dto.RawQueryRequest{
		ConnectionID: req.ConnectionID, Query: req.Input, Confirmed: req.Confirmed, Limit: &limit, Page: &page,
	})
	if err != nil {
		return nil, err
	}

	return toTable(resp), nil
}

func (s *Service) audit(ctx context.Context, connectionID uint, kind, input string, redact bool) {
	text := "[redacted]"
	if !redact {
		text = strings.Join(strings.Fields(input), " ")
		if len(text) > 500 {
			text = text[:500] + "…"
		}
	}

	s.logger.Info("cli: owner=" + helper.CtxOwnerID(ctx) + " user=" + helper.CtxUserID(ctx) + " connection=" + strconv.FormatUint(uint64(connectionID), 10) + " type=" + kind + " input=" + text)
}

func toTable(resp *dto.RawQueryResponse) *dto.CliResult {
	if resp == nil {
		return &dto.CliResult{Kind: "table", Engine: "sql"}
	}

	cols := make([]string, len(resp.Columns))
	for i, c := range resp.Columns {
		cols[i] = c.Name
	}

	rows := make([][]any, 0, len(resp.Data))
	for _, r := range resp.Data {
		row := make([]any, len(cols))
		for i, c := range cols {
			row[i] = r[c]
		}

		rows = append(rows, row)
	}

	// A full page means there may be more; the terminal says so instead of silently cutting.
	return &dto.CliResult{Kind: "table", Columns: cols, Rows: rows, RowCount: len(rows), Truncated: resp.Paginated && len(rows) >= resp.Limit, Engine: "sql"}
}
