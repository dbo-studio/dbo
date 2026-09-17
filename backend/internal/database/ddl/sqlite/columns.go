package ddlSqlite

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database/ddl"
	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/samber/lo"
)

func columnRows(input TableInput) []dto.SQLiteTableColumn {
	if input.ColumnParams == nil {
		return nil
	}

	return input.ColumnParams.Columns
}

func indexRows(input TableInput) []dto.SQLiteIndex {
	if input.IndexParams == nil {
		return nil
	}

	return input.IndexParams.Indexes
}

func filterActiveColumns(columns []dto.SQLiteTableColumn) []dto.SQLiteTableColumn {
	return lo.Filter(columns, func(col dto.SQLiteTableColumn, _ int) bool {
		if col.Added != nil && col.Deleted != nil && *col.Added && *col.Deleted {
			return false
		}

		if lo.FromPtr(col.Deleted) && !lo.FromPtr(col.Added) {
			return false
		}

		if col.Added == nil || *col.Added {
			return true
		}

		return col.New != nil
	})
}

func columnDefinitions(columns []dto.SQLiteTableColumn) string {
	if len(columns) == 0 {
		return ""
	}

	defs := make([]string, 0, len(columns))
	for _, col := range columns {
		if def := singleColumnDefinition(col); def != "" {
			defs = append(defs, def)
		}
	}

	return strings.Join(defs, ", ")
}

func singleColumnDefinition(col dto.SQLiteTableColumn) string {
	if col.New == nil {
		return ""
	}

	name := quote.SqliteIdent(lo.FromPtr(col.New.Name))
	dataType := lo.FromPtr(col.New.DataType)
	def := fmt.Sprintf("%s %s", name, dataType)

	if isGeneratedColumnKind(col.New.ColumnKind) {
		return generatedColumnDefinition(def, col.New)
	}

	if col.New.NotNull != nil && *col.New.NotNull {
		def += " NOT NULL"
	}

	if col.New.Default != nil && *col.New.Default != "" {
		if expr := ddl.SQLExpression(*col.New.Default); expr != "" {
			def += fmt.Sprintf(" DEFAULT %s", expr)
		}
	}

	if col.New.CollectionName != nil && *col.New.CollectionName != "" && *col.New.CollectionName != "stored" {
		if expr := ddl.SQLExpression(*col.New.CollectionName); expr != "" {
			def += " COLLATE " + quote.SqliteIdent(expr)
		}
	}

	if action := ddl.SqliteOnConflict(lo.FromPtr(col.New.OnNullConflicts)); action != "" {
		def += " ON CONFLICT " + action
	}

	return def
}

func generatedColumnDefinition(baseDef string, colData *dto.SQLiteTableColumnData) string {
	def := baseDef + " GENERATED ALWAYS AS"

	if colData.Default != nil && *colData.Default != "" {
		if expr := ddl.SQLExpression(*colData.Default); expr != "" {
			def += fmt.Sprintf(" (%s)", expr)
		}
	}

	if isStoredGeneratedColumn(colData) {
		def += " STORED"
	} else {
		def += " VIRTUAL"
	}

	return def
}

func isGeneratedColumnKind(kind *string) bool {
	switch strings.ToUpper(lo.FromPtr(kind)) {
	case "GENERATED", "GENERATED_VIRTUAL", "GENERATED_STORED":
		return true
	default:
		return false
	}
}

func isStoredGeneratedColumn(colData *dto.SQLiteTableColumnData) bool {
	if strings.EqualFold(lo.FromPtr(colData.ColumnKind), "GENERATED_STORED") {
		return true
	}

	return colData.CollectionName != nil && *colData.CollectionName == "stored"
}

type copyColumn struct {
	dest string
	src  string
}

func commonColumns(columns []dto.SQLiteTableColumn) []copyColumn {
	common := make([]copyColumn, 0)

	for _, col := range columns {
		if isColumnAddedOrDeleted(col) {
			continue
		}

		src := oldColumnName(col)

		dest := newColumnName(col)
		if src == "" || dest == "" {
			continue
		}

		common = append(common, copyColumn{
			dest: quote.SqliteIdent(dest),
			src:  quote.SqliteIdent(src),
		})
	}

	return common
}

func isColumnAddedOrDeleted(col dto.SQLiteTableColumn) bool {
	return (col.Added != nil && *col.Added) || (col.Deleted != nil && *col.Deleted)
}

func newColumnName(col dto.SQLiteTableColumn) string {
	if col.New != nil && col.New.Name != nil {
		return *col.New.Name
	}

	return oldColumnName(col)
}

func oldColumnName(col dto.SQLiteTableColumn) string {
	if col.Old != nil && col.Old.Name != nil {
		return *col.Old.Name
	}

	if col.New != nil && col.New.Name != nil {
		return *col.New.Name
	}

	return ""
}

func isIndexRenamed(idx dto.SQLiteIndex) bool {
	return idx.New != nil && idx.Old != nil &&
		idx.New.Name != nil && idx.Old.Name != nil &&
		*idx.New.Name != *idx.Old.Name
}
