package serviceConnector

import (
	"testing"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
)

func newConnectorForTest(t *testing.T, s *service, connType string, cfg map[string]any, secrets map[string]string) *model.BackupConnector {
	t.Helper()

	c := &model.BackupConnector{Enabled: true}

	err := s.apply(c, specs[connType].kind, &dto.ConnectorRequest{Type: connType, Name: "x", Config: cfg, Secrets: secrets})
	if err != nil {
		t.Fatal(err)
	}

	return c
}
