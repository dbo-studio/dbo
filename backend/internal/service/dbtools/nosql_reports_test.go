package serviceDbtools

import "testing"

func TestNoSQLReportToolsAreMongoOnly(t *testing.T) {
	names := func(reports bool) map[string]bool {
		out := map[string]bool{}
		for _, tool := range NoSQLChatTools(true, "", reports) {
			out[tool.OfFunction.Function.Name] = true
		}

		return out
	}

	mongo, redis := names(true), names(false)

	for _, name := range []string{ToolShowChart, ToolSaveReport, ToolListReports, ToolPinReport} {
		if !mongo[name] || redis[name] {
			t.Errorf("%s: mongo=%v redis=%v", name, mongo[name], redis[name])
		}

		if !AllowedNoSQLTool(true, "", true, name) || AllowedNoSQLTool(true, "", false, name) {
			t.Errorf("%s: wrong allow verdict", name)
		}
	}

	if !redis[ToolRunCommand] {
		t.Error("redis lost run_command")
	}
}
