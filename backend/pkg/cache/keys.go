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

func TreeCachePrefix(ownerID string, connectionID uint) string {
	return fmt.Sprintf("%sc:%d:tree:", ownerPrefix(ownerID), connectionID)
}

func TreeKey(ownerID string, connectionID uint, parentID string) string {
	return fmt.Sprintf("%s%s", TreeCachePrefix(ownerID, connectionID), parentID)
}

func AutoCompleteCachePrefix(ownerID string, connectionID uint) string {
	return fmt.Sprintf("%sc:%d:auto_complete:", ownerPrefix(ownerID), connectionID)
}

func AutoCompleteKey(ownerID string, connectionID uint, database, schema string) string {
	return fmt.Sprintf("%sdatabase_%s_schema_%s", AutoCompleteCachePrefix(ownerID, connectionID), database, schema)
}

func AICompleteCachePrefix(ownerID string, connectionID uint) string {
	return fmt.Sprintf("%sc:%d:ai_complete:", ownerPrefix(ownerID), connectionID)
}

func AICompleteKey(ownerID string, connectionID uint, hashHex string) string {
	return fmt.Sprintf("%s%s", AICompleteCachePrefix(ownerID, connectionID), hashHex)
}

func ownerPrefix(ownerID string) string {
	if ownerID == "" {
		ownerID = "desktop"
	}

	return "o:" + encodeOwnerID(ownerID) + ":"
}

func MySQLQueryCachePrefix(connectionID uint) string {
	return fmt.Sprintf("c:%d:mysql:", connectionID)
}

func MySQLQueryKey(connectionID uint, parts ...string) string {
	return fmt.Sprintf("%s%s", MySQLQueryCachePrefix(connectionID), strings.Join(parts, "_"))
}

func PostgresQueryCachePrefix(connectionID uint) string {
	return fmt.Sprintf("c:%d:postgresql:query_generator:", connectionID)
}

func PostgresQueryKey(connectionID uint, parts ...string) string {
	return fmt.Sprintf("%s%s", PostgresQueryCachePrefix(connectionID), strings.Join(parts, "_"))
}

func ConnectionSecretKey(ownerID string, connectionID uint) string {
	return fmt.Sprintf("sec:%s:conn:%d", encodeOwnerID(ownerID), connectionID)
}

func encodeOwnerID(ownerID string) string {
	return base64.RawURLEncoding.EncodeToString([]byte(ownerID))
}
