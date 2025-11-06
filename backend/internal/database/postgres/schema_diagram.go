package databasePostgres

import (
	"fmt"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/samber/lo"
)

func (r *PostgresRepository) SchemaDiagram(req *dto.SchemaDiagramRequest) (*dto.SchemaDiagramResponse, error) {
	schema := lo.FromPtr(req.Schema)
	if schema == "" {
		schema = "public"
	}

	// Get current database name
	var currentDB string
	err := r.db.Raw("SELECT current_database()").Scan(&currentDB).Error
	if err != nil {
		currentDB = "" // Fallback if we can't get database name
	}

	// Get all tables in schema
	tableList, err := r.getAllTableList(lo.ToPtr(true))
	if err != nil {
		return nil, err
	}

	// Filter tables by schema
	tables := make([]Table, 0)
	for _, table := range tableList {
		// Assuming table has schema info, we need to check schema
		// For now, get all tables and filter by schema in query
		tables = append(tables, table)
	}

	// Get tables with schema filtering
	var filteredTables []struct {
		SchemaName string `gorm:"column:schema_name"`
		TableName  string `gorm:"column:table_name"`
	}
	err = r.db.Table("pg_namespace AS n").
		Select("n.nspname AS schema_name, t.tablename AS table_name").
		Joins("LEFT JOIN pg_tables t ON n.nspname = t.schemaname::name").
		Where("n.nspname = ? AND t.tablename != ''", schema).
		Order("schema_name, table_name").
		Scan(&filteredTables).Error

	if err != nil {
		return nil, err
	}

	diagramTables := make([]dto.DiagramTable, 0)
	allRelationships := make([]dto.DiagramRelationship, 0)

	for _, ft := range filteredTables {
		tableID := fmt.Sprintf("%s.%s", ft.SchemaName, ft.TableName)

		// Get columns
		columns, err := r.getColumns(ft.TableName, &schema, []string{}, false)
		if err != nil {
			continue
		}

		// Get primary keys
		primaryKeys, err := r.getPrimaryKeys(Table{Name: ft.TableName})
		if err != nil {
			continue
		}

		pkMap := make(map[string]bool)
		for _, pk := range primaryKeys {
			pkMap[pk] = true
		}

		// Get foreign keys
		foreignKeys, err := r.getForeignKeys(ft.TableName, &schema)
		if err != nil {
			continue
		}

		// Build diagram columns
		diagramColumns := make([]dto.DiagramColumn, 0)
		for _, col := range columns {
			isPrimary := pkMap[col.ColumnName]
			_, isForeign := foreignKeys[col.ColumnName]

			defaultVal := lo.Ternary(col.ColumnDefault.Valid, &col.ColumnDefault.String, nil)
			comment := lo.Ternary(col.Comment.Valid, &col.Comment.String, nil)

			diagramColumns = append(diagramColumns, dto.DiagramColumn{
				Name:      col.ColumnName,
				Type:      col.MappedType,
				NotNull:   col.IsNullable == "NO",
				Default:   defaultVal,
				Comment:   comment,
				IsPrimary: isPrimary,
				IsForeign: isForeign,
			})
		}

		diagramTables = append(diagramTables, dto.DiagramTable{
			ID:          tableID,
			Database:    currentDB,
			Schema:      ft.SchemaName,
			Name:        ft.TableName,
			Columns:     diagramColumns,
			PrimaryKeys: primaryKeys,
		})

		// Build relationships - get all FK constraints with details
		type FKConstraintInfo struct {
			ColumnName       string `gorm:"column:column_name"`
			ConstraintName   string `gorm:"column:constraint_name"`
			ReferencedTable  string `gorm:"column:referenced_table"`
			ReferencedColumn string `gorm:"column:referenced_column"`
			OnDelete         string `gorm:"column:on_delete"`
			OnUpdate         string `gorm:"column:on_update"`
		}

		var fkConstraints []FKConstraintInfo
		err = r.db.Table("pg_constraint c").
			Select(`
				a.attname AS column_name,
				c.conname AS constraint_name,
				ct.relname AS referenced_table,
				af.attname AS referenced_column,
				CASE c.confdeltype
					WHEN 'a' THEN 'NO ACTION'
					WHEN 'r' THEN 'RESTRICT'
					WHEN 'c' THEN 'CASCADE'
					WHEN 'n' THEN 'SET NULL'
					WHEN 'd' THEN 'SET DEFAULT'
				END AS on_delete,
				CASE c.confupdtype
					WHEN 'a' THEN 'NO ACTION'
					WHEN 'r' THEN 'RESTRICT'
					WHEN 'c' THEN 'CASCADE'
					WHEN 'n' THEN 'SET NULL'
					WHEN 'd' THEN 'SET DEFAULT'
				END AS on_update
			`).
			Joins("JOIN pg_class t ON t.oid = c.conrelid").
			Joins("JOIN pg_class ct ON ct.oid = c.confrelid").
			Joins("JOIN pg_namespace n ON n.oid = t.relnamespace").
			Joins("JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)").
			Joins("JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = ANY(c.confkey)").
			Where("n.nspname = ? AND t.relname = ? AND c.contype = 'f'", schema, ft.TableName).
			Scan(&fkConstraints).Error

		if err == nil {
			for _, fk := range fkConstraints {
				// Check if referenced table is in the same schema
				refTableID := fmt.Sprintf("%s.%s", schema, fk.ReferencedTable)

				allRelationships = append(allRelationships, dto.DiagramRelationship{
					ID:             fmt.Sprintf("%s_%s->%s_%s", tableID, fk.ColumnName, refTableID, fk.ReferencedColumn),
					SourceTable:    tableID,
					SourceColumn:   fk.ColumnName,
					TargetTable:    refTableID,
					TargetColumn:   fk.ReferencedColumn,
					ConstraintName: fk.ConstraintName,
					OnDelete:       fk.OnDelete,
					OnUpdate:       fk.OnUpdate,
				})
			}
		}
	}

	return &dto.SchemaDiagramResponse{
		Database:      currentDB,
		Tables:        diagramTables,
		Relationships: allRelationships,
	}, nil
}

func (r *PostgresRepository) CreateRelationship(req *dto.SaveRelationshipRequest) error {
	// Parse source and target tables
	sourceParts := strings.Split(req.SourceTable, ".")
	targetParts := strings.Split(req.TargetTable, ".")

	if len(sourceParts) != 2 || len(targetParts) != 2 {
		return fmt.Errorf("invalid table format, expected 'schema.table'")
	}

	sourceSchema := sourceParts[0]
	sourceTable := sourceParts[1]
	targetSchema := targetParts[0]
	targetTable := targetParts[1]

	// Build constraint name if not provided
	constraintName := req.ConstraintName
	if constraintName == "" {
		constraintName = fmt.Sprintf("fk_%s_%s", sourceTable, req.SourceColumn)
	}

	// Build SQL
	onDelete := "NO ACTION"
	if req.OnDelete != "" {
		onDelete = req.OnDelete
	}

	onUpdate := "NO ACTION"
	if req.OnUpdate != "" {
		onUpdate = req.OnUpdate
	}

	sql := fmt.Sprintf(
		"ALTER TABLE %s.%s ADD CONSTRAINT %s FOREIGN KEY (%s) REFERENCES %s.%s(%s) ON DELETE %s ON UPDATE %s",
		sourceSchema, sourceTable, constraintName, req.SourceColumn,
		targetSchema, targetTable, req.TargetColumn,
		onDelete, onUpdate,
	)

	return r.db.Exec(sql).Error
}

func (r *PostgresRepository) DeleteRelationship(req *dto.DeleteRelationshipRequest) error {
	// Parse table
	parts := strings.Split(req.Table, ".")
	if len(parts) != 2 {
		return fmt.Errorf("invalid table format, expected 'schema.table'")
	}

	schema := parts[0]
	table := parts[1]

	sql := fmt.Sprintf("ALTER TABLE %s.%s DROP CONSTRAINT %s", schema, table, req.ConstraintName)
	return r.db.Exec(sql).Error
}
