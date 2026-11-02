package repository

import (
	"context"

	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/helper"
	"gorm.io/gorm"
)

type QuestionRepoImpl struct{ db *gorm.DB }

func NewQuestionRepo(db *gorm.DB) IQuestionRepo {
	return &QuestionRepoImpl{db: db}
}

// List returns the caller's reports on a connection, newest first.
func (r QuestionRepoImpl) List(ctx context.Context, connectionID uint) ([]model.Question, error) {
	var questions []model.Question

	err := r.db.WithContext(ctx).
		Where("connection_id = ? AND owner_id = ?", connectionID, helper.CtxOwnerID(ctx)).
		Order("updated_at desc, id desc").
		Find(&questions).Error

	return questions, err
}

func (r QuestionRepoImpl) Find(ctx context.Context, id uint) (*model.Question, error) {
	var question model.Question

	err := r.db.WithContext(ctx).
		Where("id = ? AND owner_id = ?", id, helper.CtxOwnerID(ctx)).
		First(&question).Error
	if err != nil {
		return nil, err
	}

	return &question, nil
}

func (r QuestionRepoImpl) Create(ctx context.Context, question *model.Question) error {
	question.OwnerID = helper.CtxOwnerID(ctx)

	return r.db.WithContext(ctx).Create(question).Error
}

func (r QuestionRepoImpl) Save(ctx context.Context, question *model.Question) error {
	return r.db.WithContext(ctx).Save(question).Error
}

// Delete removes the report and its cards on boards; the app database does not enforce foreign keys.
func (r QuestionRepoImpl) Delete(ctx context.Context, question *model.Question) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("question_id = ?", question.ID).Delete(&model.DashboardCard{}).Error; err != nil {
			return err
		}

		return tx.Delete(question).Error
	})
}
