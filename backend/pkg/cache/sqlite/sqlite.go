package sqlite

import (
	"context"
	"errors"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/cache"

	"github.com/goccy/go-json"
	"gorm.io/gorm"
)

type ISQLiteCacheImpl struct {
	db *gorm.DB
}

func NewSQLiteCache(db *gorm.DB) cache.Cache {
	return &ISQLiteCacheImpl{
		db: db,
	}
}

func (c *ISQLiteCacheImpl) ConditionalGet(ctx context.Context, key string, result any, condition bool) error {
	if condition {
		return c.Get(ctx, key, result)
	}

	return nil
}

func (c *ISQLiteCacheImpl) Get(ctx context.Context, key string, result any) error {
	var item model.CacheItem
	err := c.db.WithContext(ctx).First(&item, "key = ?", key).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}

	if item.Expiration > 0 && time.Now().Unix() > item.Expiration {
		err = c.Delete(ctx, key)
		if err != nil {
			return err
		}
		return nil
	}

	return json.Unmarshal([]byte(item.Value), &result)
}

func (c *ISQLiteCacheImpl) Set(ctx context.Context, key string, value any, ttl *time.Duration) error {
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

	return c.db.WithContext(ctx).Save(&model.CacheItem{
		Key:        key,
		Value:      string(jsonValue),
		Expiration: expiration,
	}).Error
}

func (c *ISQLiteCacheImpl) Delete(ctx context.Context, key string) error {
	return c.db.WithContext(ctx).Delete(&model.CacheItem{}, "key = ?", key).Error
}
