package model

import (
	"encoding/json"

	"github.com/dbo-studio/dbo/pkg/permission"
)

// PermissionSet is what the user may do: every permission for an admin, otherwise the stored set. A
// stored set that is empty or unreadable grants nothing, never more than was stored.
func (u *User) PermissionSet() map[string]bool {
	if u == nil || u.Role == UserRoleAdmin {
		return permission.All()
	}

	var granted map[string]bool
	if u.Permissions != "" {
		_ = json.Unmarshal([]byte(u.Permissions), &granted)
	}

	return permission.Normalize(granted)
}

// SetPermissions stores the set; keys outside the catalog are dropped.
func (u *User) SetPermissions(granted map[string]bool) {
	if u == nil {
		return
	}

	raw, _ := json.Marshal(permission.Normalize(granted)) //nolint:errchkjson // a map of bools always marshals
	u.Permissions = string(raw)
}
