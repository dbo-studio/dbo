package sqlite

import (
	"errors"
	"github.com/dbo-studio/dbo/internal/model"
	"time"

	"github.com/goccy/go-json"
	"gorm.io/gorm"
)

type SQLiteCache struct {
	db *gorm.DB
}

func NewSQLiteCache(db *gorm.DB) *SQLiteCache {
	return &SQLiteCache{
		db: db,
	}
}

func (c *SQLiteCache) ConditionalGet(key string, result any, condition bool) error {
	if condition {
		return c.Get(key, result)
	}

	return nil
}

func (c *SQLiteCache) Get(key string, result any) error {
	var item model.CacheItem
	err := c.db.First(&item, "key = ?", key).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}

	if item.Expiration > 0 && time.Now().Unix() > item.Expiration {
		err = c.Delete(key)
		if err != nil {
			return err
		}
		return nil
	}

	return json.Unmarshal([]byte(item.Value), &result)
}

func (c *SQLiteCache) Set(key string, value any, ttl *time.Duration) error {
	var expiration int64
	if ttl != nil {
		expiration = time.Now().Add(*ttl).Unix()
	} else {
		expiration = 0
	}

	jsonValue, err := json.Marshal(value)
	if err != nil {
		return err
	}

	return c.db.Save(&model.CacheItem{
		Key:        key,
		Value:      string(jsonValue),
		Expiration: expiration,
	}).Error
}

func (c *SQLiteCache) Delete(key string) error {
	return c.db.Delete(&model.CacheItem{}, "key = ?", key).Error
}
