package ddlMysql

import "strings"

// MySQL cannot roll DDL back. Before dropping an object to recreate it, the new definition is
// created under this temporary name and dropped again, so a bad definition fails while the
// original is still in place.
const validationPrefix = "__dbo_check_"

func validationName(name string) string {
	const maxIdentifier = 64

	tmp := validationPrefix + strings.ReplaceAll(name, "`", "")
	if len(tmp) > maxIdentifier {
		return tmp[:maxIdentifier]
	}

	return tmp
}
