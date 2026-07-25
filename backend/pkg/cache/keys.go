package cache

import (
	"encoding/base64"
	"fmt"
	"strings"
)

const NewReleaseVersionKey = "new_release_version"

func ConnectionPrefix(connectionID uint) string {
	return fmt.Sprintf("c:%d", connectionID)
}

func TreeCachePrefix(connectionID uint) string {
	return fmt.Sprintf("c:%d:tree:", connectionID)
}

func TreeKey(connectionID uint, parentID string) string {
	return fmt.Sprintf("%s%s", TreeCachePrefix(connectionID), parentID)
}

func AutoCompleteCachePrefix(connectionID uint) string {
	return fmt.Sprintf("c:%d:auto_complete:", connectionID)
}

func AutoCompleteKey(connectionID uint, database, schema string) string {
	return fmt.Sprintf("%sdatabase_%s_schema_%s", AutoCompleteCachePrefix(connectionID), database, schema)
}

func AICompleteCachePrefix(connectionID uint) string {
	return fmt.Sprintf("c:%d:ai_complete:", connectionID)
}

func AICompleteKey(connectionID uint, hashHex string) string {
	return fmt.Sprintf("%s%s", AICompleteCachePrefix(connectionID), hashHex)
}

func MySQLQueryCachePrefix(connectionID uint) string {
	return fmt.Sprintf("c:%d:mysql:", connectionID)
}

func MySQLQueryKey(connectionID uint, parts ...string) string {
	return fmt.Sprintf("%s%s", MySQLQueryCachePrefix(connectionID), strings.Join(parts, "_"))
}

func PostgresQueryCachePrefix(connectionID uint) string {
	return fmt.Sprintf("c:%d:posgresql:query_generator:", connectionID)
}

func PostgresQueryKey(connectionID uint, parts ...string) string {
	return fmt.Sprintf("%s%s", PostgresQueryCachePrefix(connectionID), strings.Join(parts, "_"))
}

func ConnectionSecretKey(ownerID string, connectionID uint) string {
	return fmt.Sprintf("sec:%s:conn:%d", encodeOwnerID(ownerID), connectionID)
}

func ConnectionSecretPrefix(ownerID string) string {
	return fmt.Sprintf("sec:%s:", encodeOwnerID(ownerID))
}

func encodeOwnerID(ownerID string) string {
	return base64.RawURLEncoding.EncodeToString([]byte(ownerID))
}
