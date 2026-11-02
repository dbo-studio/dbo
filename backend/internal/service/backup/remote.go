package serviceBackup

import (
	"context"
	"os"

	"github.com/dbo-studio/dbo/internal/model"
	serviceConnector "github.com/dbo-studio/dbo/internal/service/connector"
	"github.com/dbo-studio/dbo/pkg/helper"
)

// Remote is the part of the connector service backups use: copying files to a
// destination and telling channels how a run went.
type Remote interface {
	Upload(ctx context.Context, ownerID string, destinationID uint, localPath, name string, progress func(done, total int64)) (string, error)
	Fetch(ctx context.Context, ownerID string, destinationID uint, remote, localPath string) error
	Remove(ctx context.Context, ownerID string, destinationID uint, remote string) error
	Notify(ctx context.Context, ownerID string, channelIDs []uint, e serviceConnector.Event)
}

// EnsureLocal brings an artifact's file back from its destination when the local
// copy is gone, so download, verify and restore still work after local cleanup.
func EnsureLocal(ctx context.Context, remote Remote, a *model.BackupArtifact) error {
	if !helper.IsReadableBackupPath(a.FilePath) {
		return nil
	}

	if _, err := os.Stat(a.FilePath); err == nil || a.DestinationID == 0 || a.RemotePath == "" || a.RemoteStatus != "uploaded" {
		return nil
	}

	if err := helper.EnsureBackupDir(); err != nil {
		return err
	}

	return remote.Fetch(ctx, a.OwnerID, a.DestinationID, a.RemotePath, a.FilePath)
}

// removeRemote deletes an artifact's remote copy; a missing or unreachable copy
// must not block cleanup of the local record.
func removeRemote(ctx context.Context, remote Remote, a model.BackupArtifact) {
	if remote == nil || a.DestinationID == 0 || a.RemotePath == "" || a.RemoteStatus != "uploaded" {
		return
	}

	_ = remote.Remove(ctx, a.OwnerID, a.DestinationID, a.RemotePath)
}
