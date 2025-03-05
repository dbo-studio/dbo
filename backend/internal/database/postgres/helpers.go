package databasePostgres

import "strings"

type PGNode struct {
	Database string
	Schema   string
	Table    string
}

func ExtractNode(node string) PGNode {
	//"shopping_order.public.business_notifications"
	extracted := strings.Split(node, ".")
	database := ""
	schema := ""
	table := ""

	if len(extracted) == 0 {
		return PGNode{}
	}

	if len(extracted) == 1 {
		database = extracted[0]
	}

	if len(extracted) == 2 {
		schema = extracted[1]
	}

	if len(extracted) == 3 {
		table = extracted[2]
	}

	return PGNode{
		Database: database,
		Schema:   schema,
		Table:    table,
	}
}

func isQuery(query string) bool {
	return strings.Contains(strings.ToLower(query), "select")
}

func columnMappedFormat(dataType string) string {
	switch dataType {
	case "VARCHAR", "TEXT", "UUID", "TIMESTAMP", "VARBIT":
		return "string"
	case "BOOL":
		return "boolean"
	case "INT", "INTEGER", "BIT", "FLOAT":
		return "number"
	default:
		return "string"
	}
}
