package databaseMysql

import (
	"fmt"

	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
)

func getAvailableActions(nodeType string) []databaseContract.TreeNodeAction {
	return []databaseContract.TreeNodeAction{}

	//switch nodeType {
	//case "root":
	//	return []string{"createDatabase"}
	//case "database":
	//	return []string{"createTable", "createView", "createIndex", "dropDatabase"}
	//case "tableContainer":
	//	return []string{"createTable"}
	//case "viewContainer":
	//	return []string{"createView"}
	//case "indexContainer":
	//	return []string{"createIndex"}
	//case "table":
	//	return []string{"editTable", "dropTable", "copy_name"}
	//case "view":
	//	return []string{"editView", "dropView"}
	//case "index":
	//	return []string{"editIndex", "dropIndex"}
	//default:
	//	return []string{}
	//}
}

func getFormFields(r *MySQLRepository, action string) []databaseContract.FormField {
	switch action {
	case "createDatabase":
		charsetOptions := r.getCharsetOptions()
		collationOptions := r.getCollationOptions()
		return []databaseContract.FormField{
			{ID: "name", Name: "DatabaseNodeType Name", Type: "text", Required: true},
			{ID: "charset", Name: "Character Set", Type: "select", Options: charsetOptions},
			{ID: "collation", Name: "Collation", Type: "select", Options: collationOptions},
		}
	case "createTable", "editTable":
		return []databaseContract.FormField{
			{ID: "name", Name: "TableNodeType Name", Type: "text", Required: true},
			{ID: "columns", Name: "Columns", Type: "array", Required: true, Options: []databaseContract.FormFieldOption{
				{Value: "name", Name: "Column Name"},
				{Value: "dataType", Name: "Data Type"},
				{Value: "notNull", Name: "Not Null"},
				{Value: "primary", Name: "Primary Key"},
			}},
			{ID: "engine", Name: "Engine", Type: "select", Options: []databaseContract.FormFieldOption{
				{Value: "InnoDB", Name: "InnoDB"},
				{Value: "MyISAM", Name: "MyISAM"},
			}},
		}
	case "createView", "editView":
		return []databaseContract.FormField{
			{ID: "name", Name: "ViewNodeType Name", Type: "text", Required: true},
			{ID: "query", Name: "Query", Type: "textarea", Required: true},
			{ID: "orReplace", Name: "Or Replace", Type: "checkbox"},
		}
	case "createIndex", "editIndex":
		return []databaseContract.FormField{
			{ID: "name", Name: "IndexNodeType Name", Type: "text", Required: true},
			{ID: "tableName", Name: "TableNodeType Name", Type: "text", Required: true},
			{ID: "columns", Name: "Columns", Type: "array", Required: true, Options: []databaseContract.FormFieldOption{
				{Value: "name", Name: "Column Name"},
			}},
		}
	case "dropDatabase", "dropTable", "dropView", "dropIndex":
		return []databaseContract.FormField{
			{ID: "ifExists", Name: "If Exists", Type: "checkbox"},
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
			Name:  fmt.Sprintf("%s (%s)", charset.Charset, charset.Description),
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
			Name:  fmt.Sprintf("%s (%s)", collation.Collation, collation.Charset),
		}
	}
	return options
}
