package migrations

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"time"

	"github.com/dbo-studio/dbo/config"
	secretStore "github.com/dbo-studio/dbo/internal/service/secret_store"
	"github.com/dbo-studio/dbo/pkg/cryptoutil"
	"github.com/pressly/goose/v3"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
)

func init() {
	goose.AddMigrationContext(upMigrateConnectionPasswordsToSecrets, downMigrateConnectionPasswordsToSecrets)
}

func upMigrateConnectionPasswordsToSecrets(ctx context.Context, tx *sql.Tx) error {
	cfg := config.New()
	if cfg.App.Client != config.ClientDesktop {
		return nil
	}

	secret, err := secretStore.LoadOrCreateAppSecretKey(cfg)
	if err != nil {
		return err
	}

	aesKey := sha256.Sum256([]byte(secret))

	hasOwnerID, err := sqliteHasColumn(ctx, tx, "connections", "owner_id")
	if err != nil {
		return err
	}

	var rows *sql.Rows
	if hasOwnerID {
		rows, err = tx.QueryContext(ctx, "SELECT id, owner_id, options FROM connections")
	} else {
		rows, err = tx.QueryContext(ctx, "SELECT id, '' AS owner_id, options FROM connections")
	}

	if err != nil {
		return err
	}

	defer rows.Close()

	for rows.Next() {
		var (
			idInt64 int64
			ownerID string
			options sql.NullString
		)
		if err := rows.Scan(&idInt64, &ownerID, &options); err != nil {
			return err
		}

		opts := options.String

		password := gjson.Get(opts, "password").String()
		if password == "" {
			continue
		}

		if ownerID == "" {
			ownerID = "desktop"
		}

		now := time.Now()
		_ = execSQL(ctx, tx, "INSERT OR IGNORE INTO web_sessions (id, created_at, last_seen_at) VALUES (?, ?, ?)", ownerID, now, now)
		_ = execSQL(ctx, tx, "UPDATE web_sessions SET last_seen_at = ? WHERE id = ?", now, ownerID)

		ciphertext, err := cryptoutil.EncryptAESGCM(aesKey[:], []byte(password))
		if err != nil {
			return err
		}

		if _, err := tx.ExecContext(
			ctx,
			`INSERT INTO web_connection_secrets (session_id, connection_id, ciphertext, remember, expires_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?)
			ON CONFLICT(session_id, connection_id)
			DO UPDATE SET ciphertext = excluded.ciphertext, remember = excluded.remember, expires_at = excluded.expires_at, updated_at = excluded.updated_at`,
			ownerID,
			idInt64,
			ciphertext,
			true,
			nil,
			now,
		); err != nil {
			return err
		}

		stripped, err := sjson.Delete(opts, "password")
		if err != nil {
			return err
		}

		if _, err := tx.ExecContext(ctx, "UPDATE connections SET options = ? WHERE id = ?", stripped, idInt64); err != nil {
			return err
		}
	}

	return rows.Err()
}

func execSQL(ctx context.Context, tx *sql.Tx, query string, args ...any) error {
	if _, err := tx.ExecContext(ctx, query, args...); err != nil {
		return err
	}

	return nil
}

func downMigrateConnectionPasswordsToSecrets(_ context.Context, _ *sql.Tx) error {
	return nil
}
