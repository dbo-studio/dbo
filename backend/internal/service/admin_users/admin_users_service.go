package serviceAdminUsers

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/helper"
	"golang.org/x/crypto/bcrypt"
)

type IAdminUsersService interface {
	List(ctx context.Context) ([]dto.AdminUserListItem, error)
	Create(ctx context.Context, req *dto.AdminCreateUserRequest) (*dto.AdminUserListItem, error)
	Update(ctx context.Context, id string, req *dto.AdminUpdateUserRequest) (*dto.AdminUserListItem, error)
}

var _ IAdminUsersService = (*IAdminUsersServiceImpl)(nil)

type IAdminUsersServiceImpl struct {
	users    repository.IUserRepo
	sessions repository.IWebSessionRepo
}

func NewAdminUsersService(users repository.IUserRepo, sessions repository.IWebSessionRepo) IAdminUsersService {
	return &IAdminUsersServiceImpl{users: users, sessions: sessions}
}

func (s *IAdminUsersServiceImpl) requireAdmin(ctx context.Context) error {
	if helper.CtxUserRole(ctx) != string(model.UserRoleAdmin) {
		return apperror.Forbidden(apperror.ErrAdminRequired)
	}

	return nil
}

func (s *IAdminUsersServiceImpl) List(ctx context.Context) ([]dto.AdminUserListItem, error) {
	if err := s.requireAdmin(ctx); err != nil {
		return nil, err
	}

	users, err := s.users.List(ctx)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	items := make([]dto.AdminUserListItem, 0, len(users))
	for i := range users {
		items = append(items, toListItem(&users[i]))
	}

	return items, nil
}

func (s *IAdminUsersServiceImpl) Create(ctx context.Context, req *dto.AdminCreateUserRequest) (*dto.AdminUserListItem, error) {
	if err := s.requireAdmin(ctx); err != nil {
		return nil, err
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	if _, err := s.users.FindByEmail(ctx, email); err == nil {
		return nil, apperror.Conflict(apperror.ErrUserEmailTaken)
	} else if !errors.Is(err, apperror.ErrUserNotFound) {
		return nil, apperror.InternalServerError(err)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	id, err := repository.GenerateID()
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	now := time.Now().UTC()
	user := &model.User{
		ID:                 id,
		Email:              email,
		PasswordHash:       string(hash),
		Role:               model.UserRole(req.Role),
		MustChangePassword: true,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	if err := s.users.Create(ctx, user); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	item := toListItem(user)

	return &item, nil
}

func (s *IAdminUsersServiceImpl) Update(ctx context.Context, id string, req *dto.AdminUpdateUserRequest) (*dto.AdminUserListItem, error) {
	if err := s.requireAdmin(ctx); err != nil {
		return nil, err
	}

	user, err := s.users.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, apperror.ErrUserNotFound) {
			return nil, apperror.NotFound(apperror.ErrUserNotFound)
		}

		return nil, apperror.InternalServerError(err)
	}

	selfID := helper.CtxUserID(ctx)
	revokeSessions := false

	if req.Disabled != nil {
		if *req.Disabled && user.ID == selfID {
			return nil, apperror.BadRequest(apperror.ErrCannotDisableSelf)
		}

		if *req.Disabled {
			now := time.Now().UTC()
			user.DisabledAt = &now
			revokeSessions = true
		} else {
			user.DisabledAt = nil
		}
	}

	if req.Role != nil {
		newRole := model.UserRole(*req.Role)
		if user.Role == model.UserRoleAdmin && newRole != model.UserRoleAdmin {
			admins, err := s.countAdmins(ctx)
			if err != nil {
				return nil, err
			}

			if admins <= 1 {
				return nil, apperror.BadRequest(apperror.ErrCannotDemoteLastAdmin)
			}
		}

		user.Role = newRole
	}

	if req.Password != nil {
		hash, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, apperror.InternalServerError(err)
		}

		user.PasswordHash = string(hash)
		user.MustChangePassword = true
		revokeSessions = true
	}

	if err := s.users.Update(ctx, user); err != nil {
		return nil, apperror.InternalServerError(err)
	}

	if revokeSessions {
		if err := s.sessions.DeleteByUserID(ctx, user.ID); err != nil {
			return nil, apperror.InternalServerError(err)
		}
	}

	item := toListItem(user)

	return &item, nil
}

func (s *IAdminUsersServiceImpl) countAdmins(ctx context.Context) (int, error) {
	users, err := s.users.List(ctx)
	if err != nil {
		return 0, apperror.InternalServerError(err)
	}

	n := 0

	for i := range users {
		if users[i].Role == model.UserRoleAdmin && !users[i].IsDisabled() {
			n++
		}
	}

	return n, nil
}

func toListItem(u *model.User) dto.AdminUserListItem {
	item := dto.AdminUserListItem{
		ID:                 u.ID,
		Email:              u.Email,
		Role:               string(u.Role),
		MustChangePassword: u.MustChangePassword,
		CreatedAt:          u.CreatedAt.UTC().Format(time.RFC3339),
	}

	if u.DisabledAt != nil {
		s := u.DisabledAt.UTC().Format(time.RFC3339)
		item.DisabledAt = &s
	}

	return item
}
