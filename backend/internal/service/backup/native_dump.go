package serviceBackup

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"net/url"
	"os/exec"
	"strconv"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/goccy/go-json"
	"github.com/samber/lo"
)

// ErrNativeUnavailable means no native tool can serve this connection, so the
// caller may fall back to DBO's built-in dump. A tool that ran and failed is
// never reported this way.
var ErrNativeUnavailable = errors.New("native backup tool unavailable")

// maxToolStderr bounds the tool output kept in an error message.
const maxToolStderr = 500

// NativeDump is a ready-to-run pg_dump or mysqldump command. The password
// travels in Env only, never on the command line.
type NativeDump struct {
	Tool    string
	Version string
	Path    string
	Args    []string
	Env     []string
	secret  string
}

type dumpTarget struct {
	host, user, database, sslMode string
	port                          int32
	needsCertFiles                bool
}

// PlanNativeDump builds the dump command for a Postgres or MySQL connection
// from the best detected tool. database and schema come from the request; an
// empty database falls back to the connection's own.
func PlanNativeDump(ctx context.Context, connection *model.Connection, password, database, schema, destPath string) (*NativeDump, error) {
	target, err := resolveDumpTarget(connection)
	if err != nil {
		return nil, err
	}

	if target.needsCertFiles {
		return nil, fmt.Errorf("%w: certificate files are not supported yet", ErrNativeUnavailable)
	}

	database = lo.CoalesceOrEmpty(database, target.database)
	if database == "" {
		return nil, errors.New("database is required")
	}

	dumpName := "mysqldump"
	if databaseContract.IsPostgresFamily(connection.ConnectionType) {
		dumpName = "pg_dump"
	}

	tool, ok := bestTool(DetectTools(ctx), dumpName)
	if !ok {
		return nil, fmt.Errorf("%w: %s not found", ErrNativeUnavailable, dumpName)
	}

	dump := &NativeDump{Tool: dumpName, Version: tool.Version, Path: tool.Path, secret: password}

	if dumpName == "pg_dump" {
		dump.Args = []string{
			"--host", target.host, "--port", strconv.Itoa(int(target.port)), "--username", target.user,
			"--dbname", database, "--no-password", "--format=plain", "--file", destPath,
		}
		if schema != "" {
			dump.Args = append(dump.Args, "--schema", schema)
		}

		dump.Env = []string{"PGPASSWORD=" + password, "PGSSLMODE=" + pgSSLMode(target.sslMode)}

		return dump, nil
	}

	dump.Args = []string{
		"--host", target.host, "--port", strconv.Itoa(int(target.port)), "--user", target.user, "--protocol=tcp",
		"--single-transaction", "--routines", "--triggers", "--events", "--result-file", destPath, database,
	}
	if mode := mysqlSSLMode(target.sslMode); mode != "" {
		dump.Args = append([]string{"--ssl-mode=" + mode}, dump.Args...)
	}

	dump.Env = []string{"MYSQL_PWD=" + password}

	return dump, nil
}

// Run executes the dump. The job context cancels the process; output is
// redacted before it reaches an error.
func (d *NativeDump) Run(ctx context.Context) error {
	var stderr bytes.Buffer

	cmd := exec.CommandContext(ctx, d.Path, d.Args...) //nolint:gosec // path comes from tool detection, args are built here
	cmd.Env = append(cmd.Environ(), d.Env...)
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		if ctx.Err() != nil {
			return ctx.Err()
		}

		return fmt.Errorf("%s failed: %s", d.Tool, d.redact(stderr.String()))
	}

	return nil
}

func (d *NativeDump) redact(output string) string {
	if d.secret != "" {
		output = strings.ReplaceAll(output, d.secret, "***")
	}

	output = strings.TrimSpace(output)
	if len(output) > maxToolStderr {
		output = output[len(output)-maxToolStderr:]
	}

	return output
}

// bestTool picks the working install of name with the highest version.
func bestTool(tools []dto.BackupTool, name string) (dto.BackupTool, bool) {
	candidates := lo.Filter(tools, func(t dto.BackupTool, _ int) bool {
		return t.Name == name && t.Found && t.Error == ""
	})
	if len(candidates) == 0 {
		return dto.BackupTool{}, false
	}

	best := candidates[0]
	for _, c := range candidates[1:] {
		if compareVersions(c.Version, best.Version) > 0 {
			best = c
		}
	}

	return best, true
}

func compareVersions(a, b string) int {
	pa, pb := strings.Split(a, "."), strings.Split(b, ".")

	for i := 0; i < max(len(pa), len(pb)); i++ {
		var na, nb int
		if i < len(pa) {
			na, _ = strconv.Atoi(pa[i])
		}

		if i < len(pb) {
			nb, _ = strconv.Atoi(pb[i])
		}

		if na != nb {
			return na - nb
		}
	}

	return 0
}

func resolveDumpTarget(connection *model.Connection) (dumpTarget, error) {
	var (
		host, user, database string
		port                 int32
		uri                  *string
		ssl                  *dto.ConnectionSSLParams
	)

	if databaseContract.IsPostgresFamily(connection.ConnectionType) {
		o, err := parseOptions[dto.PostgresqlCreateConnectionParams](connection)
		if err != nil {
			return dumpTarget{}, err
		}

		host, user, port, database, uri, ssl = o.Host, o.Username, o.Port, lo.FromPtr(o.Database), o.URI, o.SSL
	} else {
		o, err := parseOptions[dto.MysqlCreateConnectionParams](connection)
		if err != nil {
			return dumpTarget{}, err
		}

		host, user, port, database, uri, ssl = o.Host, o.Username, o.Port, lo.FromPtr(o.Database), o.URI, o.SSL
	}

	target := dumpTarget{host: host, user: user, port: port, database: database}

	if uri != nil && *uri != "" {
		parsed, err := url.Parse(*uri)
		if err != nil {
			return dumpTarget{}, err
		}

		target.host = lo.CoalesceOrEmpty(parsed.Hostname(), host)
		target.user = lo.CoalesceOrEmpty(parsed.User.Username(), user)
		target.database = lo.CoalesceOrEmpty(strings.TrimPrefix(parsed.Path, "/"), database)

		if p, err := strconv.Atoi(parsed.Port()); err == nil {
			target.port = int32(p)
		}
	}

	if ssl != nil {
		target.sslMode = dto.NormalizeSSLMode(ssl.Mode)
		target.needsCertFiles = lo.FromPtr(ssl.CACert) != "" || lo.FromPtr(ssl.ClientCert) != "" || lo.FromPtr(ssl.ClientKey) != ""
	}

	if target.host == "" || target.port == 0 {
		return dumpTarget{}, errors.New("connection host and port are required")
	}

	return target, nil
}

func parseOptions[T any](connection *model.Connection) (T, error) {
	return helper.RawJSONToStruct[T](json.RawMessage(connection.Options))
}

func pgSSLMode(mode string) string {
	if mode == "" {
		return dto.SSLModePrefer
	}

	return mode
}

// mysqlSSLMode maps DBO's modes to mysqldump's --ssl-mode; empty omits it.
func mysqlSSLMode(mode string) string {
	switch mode {
	case dto.SSLModeDisable:
		return "DISABLED"
	case dto.SSLModePrefer:
		return "PREFERRED"
	case dto.SSLModeRequire:
		return "REQUIRED"
	case dto.SSLModeVerifyCA:
		return "VERIFY_CA"
	case dto.SSLModeVerifyFull:
		return "VERIFY_IDENTITY"
	default:
		return ""
	}
}
