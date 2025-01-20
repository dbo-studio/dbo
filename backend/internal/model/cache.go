package model

type CacheItem struct {
	Key        string `gorm:"primaryKey"`
	Value      string
	Expiration int64
}
