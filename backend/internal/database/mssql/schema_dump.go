package databaseMssql

import (
	"context"
	generic "github.com/dbo-studio/dbo/internal/database/generic"
	"strings"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

// DumpTable writes the table with its primary key and checks inline, and indexes, unique constraints and
// foreign keys in Post. Identity is not carried: loading explicit ids into an IDENTITY column needs
// SET IDENTITY_INSERT per table, which a dump cannot express.
func (m mssql) DumpTable(ctx context.Context, db *gorm.DB, ns, table string) (contract.TableDDL, error) {
	columns, err := m.Columns(ctx, db, ns, table)
	if err != nil {
		return contract.TableDDL{}, err
	}

	var computed []struct {
		Name       string
		Definition string
		Persisted  bool
	}

	if err := db.Raw(`SELECT name, definition, is_persisted AS persisted FROM sys.computed_columns WHERE object_id = OBJECT_ID(?)`, m.table(ns, table)).Scan(&computed).Error; err != nil {
		return contract.TableDDL{}, err
	}

	computedByName := lo.SliceToMap(computed, func(c struct {
		Name       string
		Definition string
		Persisted  bool
	}) (string, string) {
		return c.Name, c.Definition
	})

	defs := make([]string, 0, len(columns)+2)

	for _, c := range columns {
		if definition, isComputed := computedByName[c.Name]; isComputed {
			persisted := lo.Contains(lo.FilterMap(computed, func(x struct {
				Name       string
				Definition string
				Persisted  bool
			}, _ int) (string, bool) {
				return x.Name, x.Persisted
			}), c.Name)
			defs = append(defs, m.Quote(c.Name)+" AS "+definition+lo.Ternary(persisted, " PERSISTED", ""))

			continue
		}

		defs = append(defs, m.columnDefinition(generic.ColSpec{Name: c.Name, Type: c.DataType, NotNull: c.NotNull, Default: lo.FromPtr(c.Default)}))
	}

	keys, err := m.Keys(ctx, db, ns, table)
	if err != nil {
		return contract.TableDDL{}, err
	}

	post := []string{}

	for _, k := range keys {
		constraint := "CONSTRAINT " + m.Quote(k.Name) + " " + k.Type + " (" + m.quoteAll(k.Columns) + ")"
		if k.Type == "PRIMARY KEY" {
			defs = append(defs, constraint)
		} else {
			post = append(post, "ALTER TABLE "+m.table(ns, table)+" ADD "+constraint+";")
		}
	}

	checks, err := m.Checks(ctx, db, ns, table)
	if err != nil {
		return contract.TableDDL{}, err
	}

	for _, k := range checks {
		defs = append(defs, "CONSTRAINT "+m.Quote(k.Name)+" CHECK ("+k.Expression+")")
	}

	indexes, err := m.IndexList(ctx, db, ns, table)
	if err != nil {
		return contract.TableDDL{}, err
	}

	for _, i := range indexes {
		sqls, _ := m.AddIndex(ns, table, i)
		post = append(post, sqls[0]+";")
	}

	foreignKeys, err := m.ForeignKeys(ctx, db, ns, table)
	if err != nil {
		return contract.TableDDL{}, err
	}

	var parents []string

	for _, fk := range foreignKeys {
		fk.OnDelete, fk.OnUpdate = strings.ReplaceAll(fk.OnDelete, "_", " "), strings.ReplaceAll(fk.OnUpdate, "_", " ")
		if fk.OnDelete == "NO ACTION" {
			fk.OnDelete = ""
		}

		if fk.OnUpdate == "NO ACTION" {
			fk.OnUpdate = ""
		}

		sql, err := m.AddForeignKey(ns, table, fk)
		if err != nil {
			return contract.TableDDL{}, err
		}

		post = append(post, sql+";")

		parents = append(parents, fk.RefTable)
	}

	return contract.TableDDL{
		Name:             table,
		Create:           "CREATE TABLE " + m.table(ns, table) + " (" + strings.Join(defs, ", ") + ");",
		Post:             post,
		DependsOn:        parents,
		GeneratedColumns: lo.Keys(computedByName),
	}, nil
}
