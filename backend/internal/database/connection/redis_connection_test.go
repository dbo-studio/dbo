package databaseConnection

import (
	"testing"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/goccy/go-json"
	"github.com/tidwall/gjson"
)

func TestRedisConnectionSSH(t *testing.T) {
	t.Parallel()

	if _, err := CreateRedisConnection(json.RawMessage(`{"host":"r","port":6379,"ssh":{"enabled":true,"host":"b","username":"u"}}`)); err == nil {
		t.Error("a new tunnel needs its secret")
	}

	stored := json.RawMessage(`{"host":"r","port":6379,"ssh":{"enabled":true,"host":"b","port":22,"username":"u","authMethod":"password","password":"stored"}}`)

	out, err := UpdateRedisConnection(stored, json.RawMessage(`{"host":"r2","port":6379,"ssh":{"enabled":true,"host":"b","port":22,"username":"u","authMethod":"password"}}`))
	if err != nil {
		t.Fatal(err)
	}

	if gjson.Get(out, "ssh.password").String() != "stored" || gjson.Get(out, "host").String() != "r2" {
		t.Errorf("blank secret must keep the stored one: %s", out)
	}

	host, port, err := sshRemoteTarget(&model.Connection{ConnectionType: "valkey", Options: `{"host":"r"}`})
	if err != nil || host != "r" || port != "6379" {
		t.Errorf("target = %q %q %v", host, port, err)
	}
}
