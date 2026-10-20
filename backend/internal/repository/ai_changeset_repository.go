package repository

import (
	"context"

	"github.com/dbo-studio/dbo/internal/model"
	"gorm.io/gorm"
)

type AiChangesetRepoImpl struct{ db *gorm.DB }

func NewAiChangesetRepo(db *gorm.DB) IAiChangesetRepo {
	return &AiChangesetRepoImpl{
		db: db,
	}
}

func (r AiChangesetRepoImpl) List(ctx context.Context, chatID uint) ([]model.AiChangeset, error) {
	var changesets []model.AiChangeset

	err := r.db.WithContext(ctx).
		Preload("Ops", func(db *gorm.DB) *gorm.DB { return db.Order("position") }).
		Where("chat_id = ?", chatID).
		Order("id").
		Find(&changesets).Error

	return changesets, err
}

func (r AiChangesetRepoImpl) Find(ctx context.Context, chatID, id uint) (*model.AiChangeset, error) {
	var changeset model.AiChangeset

	err := r.db.WithContext(ctx).
		Preload("Ops", func(db *gorm.DB) *gorm.DB { return db.Order("position") }).
		Where("id = ? AND chat_id = ?", id, chatID).
		First(&changeset).Error
	if err != nil {
		return nil, err
	}

	return &changeset, nil
}

func (r AiChangesetRepoImpl) Create(ctx context.Context, changeset *model.AiChangeset) error {
	return r.db.WithContext(ctx).Create(changeset).Error
}

// AddOps appends ops to an existing changeset.
func (r AiChangesetRepoImpl) AddOps(ctx context.Context, ops []model.AiChangesetOp) error {
	return r.db.WithContext(ctx).Create(&ops).Error
}

// SaveOps writes the definition, status and error of the given ops in one transaction.
func (r AiChangesetRepoImpl) SaveOps(ctx context.Context, ops []model.AiChangesetOp) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for i := range ops {
			if err := tx.Model(&ops[i]).Select("op_json", "status", "error").Updates(&ops[i]).Error; err != nil {
				return err
			}
		}

		return nil
	})
}
