package databaseMysql

import (
	"fmt"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

func getAvailableActions(nodeType string) []string {
	switch nodeType {
	case "root":
		return []string{"create_database"}
	case "database":
		return []string{"create_table", "create_view", "create_index", "drop_database"}
	case "table_container":
		return []string{"create_table"}
	case "view_container":
		return []string{"create_view"}
	case "index_container":
		return []string{"create_index"}
	case "table":
		return []string{"edit_table", "drop_table", "copy_name"}
	case "view":
		return []string{"edit_view", "drop_view"}
	case "index":
		return []string{"edit_index", "drop_index"}
	default:
		return []string{}
	}
}

func getFormFields(r *MySQLRepository, action string) []databaseContract.FormField {
	switch action {
	case "create_database":
		charsetOptions := r.getCharsetOptions()
		collationOptions := r.getCollationOptions()
		return []databaseContract.FormField{
			{ID: "name", Label: "Database Name", Type: "text", Required: true},
			{ID: "charset", Label: "Character Set", Type: "select", Options: charsetOptions},
			{ID: "collation", Label: "Collation", Type: "select", Options: collationOptions},
		}
	case "create_table", "edit_table":
		return []databaseContract.FormField{
			{ID: "name", Label: "Table Name", Type: "text", Required: true},
			{ID: "columns", Label: "Columns", Type: "array", Required: true, Options: []databaseContract.FormFieldOption{
				{Value: "name", Label: "Column Name"},
				{Value: "dataType", Label: "Data Type"},
				{Value: "notNull", Label: "Not Null"},
				{Value: "primary", Label: "Primary Key"},
			}},
			{ID: "engine", Label: "Engine", Type: "select", Options: []databaseContract.FormFieldOption{
				{Value: "InnoDB", Label: "InnoDB"},
				{Value: "MyISAM", Label: "MyISAM"},
			}},
		}
	case "create_view", "edit_view":
		return []databaseContract.FormField{
			{ID: "name", Label: "View Name", Type: "text", Required: true},
			{ID: "query", Label: "Query", Type: "textarea", Required: true},
			{ID: "orReplace", Label: "Or Replace", Type: "checkbox"},
		}
	case "create_index", "edit_index":
		return []databaseContract.FormField{
			{ID: "name", Label: "Index Name", Type: "text", Required: true},
			{ID: "tableName", Label: "Table Name", Type: "text", Required: true},
			{ID: "columns", Label: "Columns", Type: "array", Required: true, Options: []databaseContract.FormFieldOption{
				{Value: "name", Label: "Column Name"},
			}},
		}
	case "drop_database", "drop_table", "drop_view", "drop_index":
		return []databaseContract.FormField{
			{ID: "ifExists", Label: "If Exists", Type: "checkbox"},
		}
	default:
		return []databaseContract.FormField{}
	}
}

func (r *MySQLRepository) getCharsetOptions() []databaseContract.FormFieldOption {
	var charsets []struct {
		Charset     string `gorm:"column:CHARACTER_SET_NAME"`
		Description string `gorm:"column:DESCRIPTION"`
	}
	err := r.db.Raw("SHOW CHARACTER SET").Scan(&charsets).Error
	if err != nil {
		return []databaseContract.FormFieldOption{}
	}

	options := make([]databaseContract.FormFieldOption, len(charsets))
	for i, charset := range charsets {
		options[i] = databaseContract.FormFieldOption{
			Value: charset.Charset,
			Label: fmt.Sprintf("%s (%s)", charset.Charset, charset.Description),
		}
	}
	return options
}

func (r *MySQLRepository) getCollationOptions() []databaseContract.FormFieldOption {
	var collations []struct {
		Collation string `gorm:"column:COLLATION_NAME"`
		Charset   string `gorm:"column:CHARACTER_SET_NAME"`
	}
	err := r.db.Raw("SHOW COLLATION").Scan(&collations).Error
	if err != nil {
		return []databaseContract.FormFieldOption{}
	}

	options := make([]databaseContract.FormFieldOption, len(collations))
	for i, collation := range collations {
		options[i] = databaseContract.FormFieldOption{
			Value: collation.Collation,
			Label: fmt.Sprintf("%s (%s)", collation.Collation, collation.Charset),
		}
	}
	return options
}
