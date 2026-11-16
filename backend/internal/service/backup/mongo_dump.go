package serviceBackup

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/url"
	"os"
	"strconv"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/model"
)

// mongoCommand builds a mongodump or mongorestore command for a connection. The connection string,
// which carries the password, goes into a private config file instead of the command line, where
// other users of the machine could read it; the file is removed when the command ends.
func mongoCommand(ctx context.Context, connection *model.Connection, password, toolName string, args []string) (*NativeCommand, error) {
	dial, tunnel, err := databaseConnection.OpenTunnel(ctx, connection)
	if err != nil {
		return nil, err
	}

	return withTunnel(mongoCommandVia(ctx, dial, tunnel != nil, password, toolName, args))(tunnel)
}

// mongoCommandVia plans against dial, whose host and port already point at the SSH tunnel when tunneled is true.
func mongoCommandVia(ctx context.Context, connection *model.Connection, tunneled bool, password, toolName string, args []string) (*NativeCommand, error) {
	tool, ok := bestTool(DetectTools(ctx), toolName)
	if !ok {
		return nil, fmt.Errorf("%w: %s not found (install the MongoDB Database Tools)", ErrNativeUnavailable, toolName)
	}

	opts, err := parseOptions[dto.MongoConnectionParams](connection)
	if err != nil {
		return nil, err
	}

	uri, err := mongoURI(opts, password)
	if err != nil {
		return nil, err
	}

	if tunneled {
		// Only the tunnel's one address is reachable, so the tools must not follow replica-set discovery off it.
		if uri, err = withDirectConnection(uri); err != nil {
			return nil, err
		}
	}

	cfg, err := os.CreateTemp("", "dbo-mongo-*.yaml")
	if err != nil {
		return nil, err
	}

	_, werr := cfg.WriteString("uri: " + strconv.Quote(uri) + "\n")
	if cerr := cfg.Close(); werr == nil {
		werr = cerr
	}

	if werr != nil {
		_ = os.Remove(cfg.Name())

		return nil, werr
	}

	args = append([]string{"--config", cfg.Name()}, args...)
	if opts.TLS {
		args = append(args, "--tls")

		switch {
		case opts.TLSInsecure:
			args = append(args, "--tlsInsecure")
		case tunneled:
			// The certificate names the real host, not the tunnel's loopback address; its chain is still checked.
			args = append(args, "--sslAllowInvalidHostnames")
		}
	}

	return &NativeCommand{
		Tool: toolName, Version: tool.Version, Path: tool.Path, Args: args,
		secret: password, cleanup: []string{cfg.Name()},
	}, nil
}

func withDirectConnection(raw string) (string, error) {
	u, err := url.Parse(raw)
	if err != nil {
		return "", err
	}

	q := u.Query()
	q.Set("directConnection", "true")
	u.RawQuery = q.Encode()

	return u.String(), nil
}

// mongoURI is the connection string with the password in it.
func mongoURI(opts dto.MongoConnectionParams, password string) (string, error) {
	if opts.URI != "" {
		return databaseConnection.InjectURIPassword(opts.URI, password), nil
	}

	if opts.Host == "" {
		return "", errors.New("connection host is required")
	}

	port := opts.Port
	if port == 0 {
		port = 27017
	}

	u := url.URL{Scheme: "mongodb", Host: net.JoinHostPort(opts.Host, strconv.Itoa(int(port))), Path: "/"}

	if opts.Username != "" {
		u.User = url.UserPassword(opts.Username, password)

		authSource := opts.AuthSource
		if authSource == "" {
			authSource = "admin"
		}

		u.RawQuery = url.Values{"authSource": {authSource}}.Encode()
	}

	return u.String(), nil
}

// PlanMongoDump builds the mongodump command that writes one database, or all of them when database
// is empty, as a single archive file.
func PlanMongoDump(ctx context.Context, connection *model.Connection, password, database, destPath string) (*NativeCommand, error) {
	args := []string{"--archive=" + destPath}
	if database != "" {
		args = append(args, "--db", database)
	}

	return mongoCommand(ctx, connection, password, "mongodump", args)
}

// PlanMongoRestore builds the mongorestore command that loads an archive. When the archive holds one
// database and the target has another name, its collections are renamed into the target.
func PlanMongoRestore(ctx context.Context, connection *model.Connection, password, sourceDB, targetDB, filePath string) (*NativeCommand, error) {
	args := []string{"--archive=" + filePath}
	if sourceDB != "" && targetDB != "" && sourceDB != targetDB {
		args = append(args, "--nsFrom", sourceDB+".*", "--nsTo", targetDB+".*")
	}

	return mongoCommand(ctx, connection, password, "mongorestore", args)
}
