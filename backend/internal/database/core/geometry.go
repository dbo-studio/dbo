package databaseCore

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/twpayne/go-geom/encoding/ewkb"
	"github.com/twpayne/go-geom/encoding/wkb"
	"github.com/twpayne/go-geom/encoding/wkt"
)

var (
	pgPointParenRE = regexp.MustCompile(`(?i)^\(\s*([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*\)$`)
	wktPrefixRE    = regexp.MustCompile(`(?i)^(srid=\d+\s*;\s*)?(point|linestring|polygon|multipoint|multilinestring|multipolygon|geometrycollection)\b`)
	wktPointRE     = regexp.MustCompile(`(?i)^POINT\s*\(\s*([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*\)$`)
)

func BytesToWKT(data []byte) (string, bool) {
	if len(data) == 0 {
		return "", false
	}

	if utf8.Valid(data) {
		return NormalizeGeometryText(string(data)), true
	}

	if g, err := ewkb.Unmarshal(data); err == nil {
		if s, err := wkt.Marshal(g); err == nil {
			return s, true
		}
	}

	if g, err := wkb.Unmarshal(data); err == nil {
		if s, err := wkt.Marshal(g); err == nil {
			return s, true
		}
	}
	// MySQL often prefixes WKB with a 4-byte little-endian SRID.
	if len(data) > 4 {
		if g, err := wkb.Unmarshal(data[4:]); err == nil {
			if s, err := wkt.Marshal(g); err == nil {
				return s, true
			}
		}
	}

	return "", false
}

func NormalizeGeometryText(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return trimmed
	}

	if wktPrefixRE.MatchString(trimmed) {
		return trimmed
	}

	if m := pgPointParenRE.FindStringSubmatch(trimmed); m != nil {
		x, errX := strconv.ParseFloat(m[1], 64)

		y, errY := strconv.ParseFloat(m[2], 64)
		if errX == nil && errY == nil {
			return fmt.Sprintf("POINT(%g %g)", x, y)
		}
	}

	return trimmed
}

func IsGeometryDBType(dbType string) bool {
	normalized := normalizeDBType(dbType)
	switch normalized {
	case "GEOMETRY", "GEOGRAPHY", "POINT", "LINESTRING", "POLYGON",
		"MULTIPOINT", "MULTILINESTRING", "MULTIPOLYGON", "GEOMETRYCOLLECTION",
		"BOX", "CIRCLE", "PATH", "LSEG":
		return true
	default:
		return false
	}
}

func FormatGeometrySQL(driver, dbType, wkt string) (string, error) {
	trimmed := strings.TrimSpace(wkt)
	if trimmed == "" {
		return "NULL", nil
	}

	escaped := strings.ReplaceAll(trimmed, "'", "''")
	normalizedType := normalizeDBType(dbType)

	switch helper.NormalizeSQLDriver(driver) {
	case "postgresql":
		switch normalizedType {
		case "POINT":
			paren, ok := WKTPointToParen(trimmed)
			if !ok {
				return "", fmt.Errorf("invalid POINT WKT: %s", trimmed)
			}

			return fmt.Sprintf("'%s'", paren), nil
		case "GEOMETRY", "GEOGRAPHY":
			return fmt.Sprintf("ST_GeomFromText('%s')", escaped), nil
		default:
			if paren, ok := WKTPointToParen(trimmed); ok {
				return fmt.Sprintf("'%s'", paren), nil
			}

			return fmt.Sprintf("'%s'", escaped), nil
		}
	case "mysql":
		return fmt.Sprintf("ST_GeomFromText('%s')", escaped), nil
	default:
		return fmt.Sprintf("'%s'", escaped), nil
	}
}

func WKTPointToParen(wkt string) (string, bool) {
	trimmed := strings.TrimSpace(wkt)
	if m := pgPointParenRE.FindStringSubmatch(trimmed); m != nil {
		x, errX := strconv.ParseFloat(m[1], 64)

		y, errY := strconv.ParseFloat(m[2], 64)
		if errX == nil && errY == nil {
			return fmt.Sprintf("(%g,%g)", x, y), true
		}
	}

	if m := wktPointRE.FindStringSubmatch(trimmed); m != nil {
		x, errX := strconv.ParseFloat(m[1], 64)

		y, errY := strconv.ParseFloat(m[2], 64)
		if errX == nil && errY == nil {
			return fmt.Sprintf("(%g,%g)", x, y), true
		}
	}

	return "", false
}

func normalizeDBType(dbType string) string {
	normalized := strings.ToUpper(strings.TrimSpace(dbType))
	if idx := strings.Index(normalized, "("); idx > -1 {
		normalized = normalized[:idx]
	}

	if idx := strings.LastIndex(normalized, "."); idx > -1 {
		normalized = normalized[idx+1:]
	}

	return normalized
}
