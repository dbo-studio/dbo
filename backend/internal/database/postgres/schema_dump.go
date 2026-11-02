package databasePostgres

import (
	"context"
	"fmt"
	"strings"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/samber/lo"
)

type pgDumpColumn struct {
	Name         string  `gorm:"column:name"`
	Type         string  `gorm:"column:type"`
	NotNull      bool    `gorm:"column:not_null"`
	Default      *string `gorm:"column:def"`
	Identity     string  `gorm:"column:identity"`
	Generated    string  `gorm:"column:generated"`
	SerialSource *string `gorm:"column:serial_seq"`
}

type pgDumpConstraint struct {
	Name      string  `gorm:"column:name"`
	Kind      string  `gorm:"column:kind"`
	Def       string  `gorm:"column:def"`
	RefTable  *string `gorm:"column:ref_table"`
	RefSchema *string `gorm:"column:ref_schema"`
}

// DumpSchema rebuilds CREATE TABLE from the catalog (Postgres has no
// SHOW CREATE). Foreign keys and indexes go in Post so table order never
// matters; the schema is created and put on search_path so names stay
// unqualified.
func (r *PostgresRepository) DumpSchema(ctx context.Context, database, schema *string, tables []string) (*databaseContract.SchemaDump, error) {
	schemaName := lo.FromPtr(schema)
	if schemaName == "" {
		return nil, fmt.Errorf("schema is required to dump a postgres schema")
	}

	conn, err := r.db(ctx, database)
	if err != nil {
		return nil, err
	}

	db := conn.WithContext(ctx)
	quote := func(s string) string { return databaseCore.QuotePGIdent(s) }
	dump := &databaseContract.SchemaDump{
		Preamble: []string{
			"CREATE SCHEMA IF NOT EXISTS " + quote(schemaName) + ";",
			"SET search_path TO " + quote(schemaName) + ";",
		},
	}

	for _, table := range tables {
		var columns []pgDumpColumn

		err := db.Raw(`
			SELECT a.attname AS name,
				format_type(a.atttypid, a.atttypmod) AS type,
				a.attnotnull AS not_null,
				pg_get_expr(d.adbin, d.adrelid) AS def,
				a.attidentity::text AS identity,
				a.attgenerated::text AS generated,
				pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) AS serial_seq
			FROM pg_attribute a
			JOIN pg_class c ON c.oid = a.attrelid
			JOIN pg_namespace n ON n.oid = c.relnamespace
			LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
			WHERE n.nspname = ? AND c.relname = ? AND c.relkind IN ('r', 'p')
				AND a.attnum > 0 AND NOT a.attisdropped
			ORDER BY a.attnum
		`, schemaName, table).Scan(&columns).Error
		if err != nil {
			return nil, err
		}

		if len(columns) == 0 {
			return nil, fmt.Errorf("table %s not found in schema %s", table, schemaName)
		}

		var constraints []pgDumpConstraint

		err = db.Raw(`
			SELECT con.conname AS name, con.contype::text AS kind,
				pg_get_constraintdef(con.oid) AS def,
				rc.relname AS ref_table, rn.nspname AS ref_schema
			FROM pg_constraint con
			JOIN pg_class c ON c.oid = con.conrelid
			JOIN pg_namespace n ON n.oid = c.relnamespace
			LEFT JOIN pg_class rc ON rc.oid = con.confrelid
			LEFT JOIN pg_namespace rn ON rn.oid = rc.relnamespace
			WHERE n.nspname = ? AND c.relname = ? AND con.contype IN ('p', 'u', 'c', 'f')
			ORDER BY con.contype = 'f', con.conname
		`, schemaName, table).Scan(&constraints).Error
		if err != nil {
			return nil, err
		}

		var indexes []string

		err = db.Raw(`
			SELECT i.indexdef FROM pg_indexes i
			WHERE i.schemaname = ? AND i.tablename = ?
				AND i.indexname NOT IN (
					SELECT con.conname FROM pg_constraint con
					JOIN pg_class c ON c.oid = con.conrelid
					JOIN pg_namespace n ON n.oid = c.relnamespace
					WHERE n.nspname = ? AND c.relname = ?)
			ORDER BY i.indexname
		`, schemaName, table, schemaName, table).Scan(&indexes).Error
		if err != nil {
			return nil, err
		}

		ddl := databaseContract.TableDDL{Name: table}
		defs := make([]string, 0, len(columns)+len(constraints))

		for _, col := range columns {
			defs = append(defs, pgColumnDef(col))

			if col.Generated == "s" {
				ddl.GeneratedColumns = append(ddl.GeneratedColumns, col.Name)
			}

			if col.Identity == "a" {
				ddl.OverridingIdentity = true
			}

			if col.SerialSource != nil && *col.SerialSource != "" {
				ddl.Post = append(ddl.Post, fmt.Sprintf(
					"SELECT setval(pg_get_serial_sequence(%s, %s), COALESCE(MAX(%s), 1), MAX(%s) IS NOT NULL) FROM %s;",
					pgLiteral(quote(table)), pgLiteral(col.Name), quote(col.Name), quote(col.Name), quote(table)))
			}
		}

		var foreignKeys []string

		for _, con := range constraints {
			clause := fmt.Sprintf("CONSTRAINT %s %s", quote(con.Name), con.Def)

			if con.Kind != "f" {
				defs = append(defs, clause)

				continue
			}

			foreignKeys = append(foreignKeys, fmt.Sprintf("ALTER TABLE %s ADD %s;", quote(table), clause))

			if lo.FromPtr(con.RefSchema) == schemaName {
				ddl.DependsOn = append(ddl.DependsOn, lo.FromPtr(con.RefTable))
			}
		}

		ddl.Create = fmt.Sprintf("CREATE TABLE %s (\n  %s\n);", quote(table), strings.Join(defs, ",\n  "))
		ddl.Post = append(ddl.Post, foreignKeys...)

		for _, index := range indexes {
			ddl.Post = append(ddl.Post, index+";")
		}

		dump.Tables = append(dump.Tables, ddl)
	}

	return dump, nil
}

func pgColumnDef(col pgDumpColumn) string {
	name := databaseCore.QuotePGIdent(col.Name)

	// Owned serial sequences come back as a nextval() default; recreate them
	// as the serial pseudo-type so the dump does not depend on the sequence.
	if col.SerialSource != nil && *col.SerialSource != "" && col.Identity == "" {
		serial := map[string]string{"smallint": "smallserial", "integer": "serial", "bigint": "bigserial"}[col.Type]
		if serial != "" {
			return name + " " + serial + pgNotNull(col)
		}
	}

	def := name + " " + col.Type

	switch col.Identity {
	case "a":
		def += " GENERATED ALWAYS AS IDENTITY"
	case "d":
		def += " GENERATED BY DEFAULT AS IDENTITY"
	}

	if col.Generated == "s" && col.Default != nil {
		return def + " GENERATED ALWAYS AS (" + *col.Default + ") STORED" + pgNotNull(col)
	}

	if col.Default != nil && col.Identity == "" {
		def += " DEFAULT " + *col.Default
	}

	return def + pgNotNull(col)
}

func pgNotNull(col pgDumpColumn) string {
	if col.NotNull {
		return " NOT NULL"
	}

	return ""
}

func pgLiteral(s string) string {
	return "'" + strings.ReplaceAll(s, "'", "''") + "'"
}
