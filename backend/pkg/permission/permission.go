// Package permission is the one list of things a signed-in member can be allowed to do. Each
// permission has a group (how the admin screen sorts them) and whether a new member gets it. To
// guard a new feature: add a line to Catalog, call helper.RequirePermission in its service, and
// add its label to the frontend locales. Nothing else needs to change.
package permission

const (
	ConnectionCreate = "connection.create"

	DataImport = "data.import"
	DataExport = "data.export"
	DataCli    = "data.cli"

	AiUse      = "ai.use"
	AiSettings = "ai.settings"
	AiMcp      = "ai.mcp"

	BackupCreate  = "backup.create"
	BackupRestore = "backup.restore"
	BackupTools   = "backup.tools"

	BoardsReports    = "boards.reports"
	BoardsDashboards = "boards.dashboards"
	BoardsShare      = "boards.share"
)

// Def describes one permission.
type Def struct {
	Key   string `json:"key"`
	Group string `json:"group"`
	// MemberDefault is whether a member created without an explicit choice has it. Admins have everything.
	MemberDefault bool `json:"default"`
}

// Catalog lists every permission in the order the admin screen shows them.
var Catalog = []Def{
	{ConnectionCreate, "connections", false},

	{DataImport, "data", true},
	{DataExport, "data", true},
	{DataCli, "data", false},

	{AiUse, "ai", true},
	{AiSettings, "ai", true},
	{AiMcp, "ai", false},

	{BackupCreate, "backup", false},
	{BackupRestore, "backup", false},
	{BackupTools, "backup", false},

	{BoardsReports, "boards", false},
	{BoardsDashboards, "boards", false},
	{BoardsShare, "boards", false},
}

// All is every permission granted: what an admin has.
func All() map[string]bool {
	set := make(map[string]bool, len(Catalog))
	for _, d := range Catalog {
		set[d.Key] = true
	}

	return set
}

// MemberDefaults is what a new member gets when no choice is made.
func MemberDefaults() map[string]bool {
	set := make(map[string]bool, len(Catalog))
	for _, d := range Catalog {
		set[d.Key] = d.MemberDefault
	}

	return set
}

// Normalize returns a set with exactly the catalog's keys: unknown keys are dropped and a missing
// key is not granted, so a permission added later is off for existing users until an admin grants it.
func Normalize(granted map[string]bool) map[string]bool {
	set := make(map[string]bool, len(Catalog))
	for _, d := range Catalog {
		set[d.Key] = granted[d.Key]
	}

	return set
}
