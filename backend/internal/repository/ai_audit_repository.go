package repository

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/db/scope"
	"github.com/dbo-studio/dbo/pkg/helper"
	"gorm.io/gorm"
)

type AiAuditRepoImpl struct{ db *gorm.DB }

func NewAiAuditRepo(db *gorm.DB) IAiAuditRepo {
	return &AiAuditRepoImpl{db: db}
}

func (r AiAuditRepoImpl) Create(ctx context.Context, entry *model.AiAuditEntry) error {
	entry.OwnerID = helper.CtxOwnerID(ctx)

	return r.db.WithContext(ctx).Create(entry).Error
}

// List returns the caller's own entries for a connection, newest first.
func (r AiAuditRepoImpl) List(ctx context.Context, req *dto.AiAuditListRequest) ([]model.AiAuditEntry, error) {
	var entries []model.AiAuditEntry

	err := r.db.WithContext(ctx).
		Scopes(scope.Paginate(&req.PaginationRequest)).
		Where("connection_id = ? AND owner_id = ?", req.ConnectionID, helper.CtxOwnerID(ctx)).
		Order("id desc").
		Find(&entries).Error

	return entries, err
}
