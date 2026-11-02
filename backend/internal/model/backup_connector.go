package model

import "time"

const (
	ConnectorKindDestination = "destination"
	ConnectorKindChannel     = "channel"
)

// BackupConnector is a place backups go (destination) or a way to tell someone
// how they went (channel). Both are a type plus plain Config; every secret
// (keys, tokens, webhook URLs) lives in SecretsEnc, an AES-GCM encrypted JSON
// map that is never returned to the client.
type BackupConnector struct {
	ID         uint       `gorm:"primaryKey;autoIncrement"`
	OwnerID    string     `gorm:"not null;default:'';index"`
	Kind       string     `gorm:"not null;default:'destination';index"`
	Type       string     `gorm:"not null;default:''"`
	Name       string     `gorm:"not null;default:''"`
	Enabled    bool       `gorm:"not null;default:true"`
	Config     string     `gorm:"not null;default:'{}'"`
	SecretsEnc string     `gorm:"not null;default:''"`
	CreatedAt  *time.Time `gorm:"autoCreateTime"`
}

func (BackupConnector) TableName() string { return "backup_connectors" }
