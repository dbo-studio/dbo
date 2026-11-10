package model

import "time"

// NoSQLRecycleEntry is a deleted item kept as a driver payload (redis DUMP) so a delete can be undone.
type NoSQLRecycleEntry struct {
	ID           uint      `gorm:"primaryKey;column:id"`
	OwnerID      string    `gorm:"column:owner_id;index:idx_nosql_recycle_owner_conn"`
	ConnectionID int32     `gorm:"column:connection_id;index:idx_nosql_recycle_owner_conn"`
	ContainerID  string    `gorm:"column:container_id"`
	ItemID       string    `gorm:"column:item_id"`
	Payload      []byte    `gorm:"column:payload"`
	TTLMs        int64     `gorm:"column:ttl_ms"`
	Size         int       `gorm:"column:size"`
	CreatedAt    time.Time `gorm:"column:created_at"`
	ExpiresAt    time.Time `gorm:"column:expires_at"`
}

func (NoSQLRecycleEntry) TableName() string { return "nosql_recycle_entries" }
