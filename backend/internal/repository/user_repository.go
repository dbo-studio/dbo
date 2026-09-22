package repository

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"gorm.io/gorm"
)

type userRepoImpl struct {
	db *gorm.DB
}

func NewUserRepo(db *gorm.DB) IUserRepo {
	return &userRepoImpl{db: db}
}

func (r *userRepoImpl) Count(ctx context.Context) (int64, error) {
	var n int64

	err := r.db.WithContext(ctx).Model(&model.User{}).Count(&n).Error

	return n, err
}

func (r *userRepoImpl) FindByID(ctx context.Context, id string) (*model.User, error) {
	var user model.User

	err := r.db.WithContext(ctx).Where("id = ?", id).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.ErrUserNotFound
		}

		return nil, err
	}

	return &user, nil
}

func (r *userRepoImpl) FindByEmail(ctx context.Context, email string) (*model.User, error) {
	var user model.User

	err := r.db.WithContext(ctx).Where("email = ?", strings.TrimSpace(email)).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.ErrUserNotFound
		}

		return nil, err
	}

	return &user, nil
}

func (r *userRepoImpl) List(ctx context.Context) ([]model.User, error) {
	var users []model.User

	err := r.db.WithContext(ctx).Order("created_at ASC").Find(&users).Error

	return users, err
}

func (r *userRepoImpl) Create(ctx context.Context, user *model.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *userRepoImpl) Update(ctx context.Context, user *model.User) error {
	user.UpdatedAt = time.Now().UTC()

	return r.db.WithContext(ctx).Save(user).Error
}

func (r *userRepoImpl) ReassignOwners(ctx context.Context, toOwnerID string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec(
			`UPDATE connections SET owner_id = ? WHERE owner_id != 'desktop' AND owner_id != ?`,
			toOwnerID, toOwnerID,
		).Error; err != nil {
			return err
		}

		if err := tx.Exec(
			`UPDATE jobs SET owner_id = ? WHERE owner_id != '' AND owner_id != 'desktop' AND owner_id != ?`,
			toOwnerID, toOwnerID,
		).Error; err != nil {
			return err
		}

		if err := tx.Exec(
			`UPDATE mcp_settings SET owner_id = ? WHERE owner_id != 'desktop' AND owner_id != ?`,
			toOwnerID, toOwnerID,
		).Error; err != nil {
			return err
		}

		for _, table := range []string{"saved_queries", "histories", "ai_chats", "ai_providers"} {
			if err := tx.Exec(
				`UPDATE `+table+` SET owner_id = ? WHERE owner_id != '' AND owner_id != 'desktop' AND owner_id != ?`,
				toOwnerID, toOwnerID,
			).Error; err != nil {
				return err
			}
		}

		// Safe Mode password rows use owner_id as PK; delete orphans (cannot merge easily).
		if err := tx.Exec(
			`DELETE FROM safe_mode_passwords WHERE owner_id != 'desktop' AND owner_id != ?`,
			toOwnerID,
		).Error; err != nil {
			return err
		}

		return nil
	})
}
