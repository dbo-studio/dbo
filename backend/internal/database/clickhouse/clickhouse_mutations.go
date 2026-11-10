package databaseClickhouse

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	generic "github.com/dbo-studio/dbo/internal/database/generic"
	"github.com/samber/lo"
)

// ClickHouse edits rows with mutations (ALTER TABLE ... UPDATE / DELETE). They run in the background unless
// mutations_sync is set, so the statement waits for them: the grid reloads right after saving.

func (clickhouse) Literal(v any) string {
	switch x := v.(type) {
	case nil:
		return "NULL"
	case bool:
		return lo.Ternary(x, "1", "0")
	case string:
		return "'" + strings.NewReplacer(`\`, `\\`, `'`, `\'`).Replace(x) + "'"
	case float64, float32, int, int64, int32, uint, uint64, uint32:
		return fmt.Sprint(x)
	case time.Time:
		return "'" + x.Format("2006-01-02 15:04:05.999999999") + "'"
	default:
		out, err := json.Marshal(x)
		if err != nil {
			return "NULL"
		}

		return "'" + strings.NewReplacer(`\`, `\\`, `'`, `\'`).Replace(string(out)) + "'"
	}
}

func (clickhouse) UpdateStatement(target string, set, where []string) string {
	return "ALTER TABLE " + target + " UPDATE " + strings.Join(set, ", ") + " WHERE " + strings.Join(where, " AND ") + " SETTINGS mutations_sync = 1"
}

func (clickhouse) DeleteStatement(target string, where []string) string {
	return "ALTER TABLE " + target + " DELETE WHERE " + strings.Join(where, " AND ") + " SETTINGS mutations_sync = 1"
}

// Insights are one-click views of system tables. They run in the editor, in the database selected there.
func (clickhouse) Insights() []generic.Insight {
	return []generic.Insight{
		{Title: "Running queries", Query: "SELECT query_id, user, round(elapsed, 2) AS elapsed_s, read_rows, formatReadableSize(memory_usage) AS memory, query FROM system.processes ORDER BY elapsed DESC"},
		{Title: "Table parts", Query: "SELECT table, partition, name, rows, formatReadableSize(bytes_on_disk) AS size, modification_time FROM system.parts WHERE database = currentDatabase() AND active ORDER BY modification_time DESC LIMIT 200"},
		{Title: "Merges", Query: "SELECT table, round(elapsed, 2) AS elapsed_s, round(progress, 3) AS progress, num_parts, result_part_name FROM system.merges WHERE database = currentDatabase()"},
		{Title: "Mutations", Query: "SELECT table, mutation_id, command, create_time, is_done, latest_fail_reason FROM system.mutations WHERE database = currentDatabase() ORDER BY create_time DESC LIMIT 200"},
	}
}
