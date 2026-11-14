package databaseConnection

import (
	"testing"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/goccy/go-json"
	"github.com/tidwall/gjson"
)

func TestCreateMongoConnectionSSH(t *testing.T) {
	t.Parallel()

	const sshPassword = `"ssh":{"enabled":true,"host":"bastion","username":"u","password":"pw"}`

	out, err := CreateMongoConnection(json.RawMessage(`{"host":"db","port":27017,` + sshPassword + `}`))
	if err != nil {
		t.Fatal(err)
	}

	if gjson.Get(out, "ssh.port").Int() != 22 || gjson.Get(out, "ssh.authMethod").String() != "password" {
		t.Errorf("ssh defaults not applied: %s", out)
	}

	cases := map[string]struct {
		params  string
		wantErr bool
	}{
		"new tunnel needs its secret": {`{"host":"db","port":27017,"ssh":{"enabled":true,"host":"b","username":"u"}}`, true},
		"srv cannot be tunneled":      {`{"uri":"mongodb+srv://c.example.net/app",` + sshPassword + `}`, true},
		"plain uri can":               {`{"uri":"mongodb://db:27017/app",` + sshPassword + `}`, false},
	}

	for name, tc := range cases {
		if _, err := CreateMongoConnection(json.RawMessage(tc.params)); (err != nil) != tc.wantErr {
			t.Errorf("%s: err = %v, wantErr %v", name, err, tc.wantErr)
		}
	}
}

func TestUpdateMongoConnectionKeepsStoredSSHSecret(t *testing.T) {
	t.Parallel()

	old := json.RawMessage(`{"host":"db","port":27017,"ssh":{"enabled":true,"host":"b","port":22,"username":"u","authMethod":"password","password":"stored"}}`)

	update := func(newParams string) string {
		t.Helper()

		out, err := UpdateMongoConnection(old, json.RawMessage(newParams))
		if err != nil {
			t.Fatal(err)
		}

		return out
	}

	out := update(`{"host":"db","port":27017,"ssh":{"enabled":true,"host":"b2","port":22,"username":"u","authMethod":"password"}}`)
	if gjson.Get(out, "ssh.password").String() != "stored" || gjson.Get(out, "ssh.host").String() != "b2" {
		t.Errorf("blank secret must keep the stored one: %s", out)
	}

	if out = update(`{"database":"x"}`); gjson.Get(out, "ssh.password").String() != "stored" {
		t.Errorf("options without ssh must keep the tunnel: %s", out)
	}

	out = update(`{"ssh":{"enabled":false}}`)
	if gjson.Get(out, "ssh.enabled").Bool() || gjson.Get(out, "ssh.host").String() != "b" {
		t.Errorf("disabling must keep settings for later: %s", out)
	}
}

func TestSSHTargetForMongo(t *testing.T) {
	t.Parallel()

	host, port, err := sshRemoteTarget(&model.Connection{ConnectionType: "mongodb", Options: `{"uri":"mongodb://u@db.internal/app"}`})
	if err != nil || host != "db.internal" || port != "27017" {
		t.Errorf("target = %q %q %v", host, port, err)
	}

	opts, err := rewriteOptionsTarget(`{"uri":"mongodb://u@db.internal/app?tls=true"}`, "127.0.0.1", "5555")
	if err != nil || gjson.Get(opts, "uri").String() != "mongodb://u@127.0.0.1:5555/app?tls=true" {
		t.Errorf("rewrite = %s %v", opts, err)
	}
}
