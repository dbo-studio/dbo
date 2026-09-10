package model

import "time"

type UserRole string

const (
	UserRoleAdmin  UserRole = "admin"
	UserRoleMember UserRole = "member"
)

type User struct {
	ID                 string     `gorm:"primaryKey;column:id"`
	Email              string     `gorm:"column:email;uniqueIndex"`
	PasswordHash       string     `gorm:"column:password_hash"`
	Role               UserRole   `gorm:"column:role"`
	MustChangePassword bool       `gorm:"column:must_change_password"`
	DisabledAt         *time.Time `gorm:"column:disabled_at"`
	CreatedAt          time.Time  `gorm:"column:created_at"`
	UpdatedAt          time.Time  `gorm:"column:updated_at"`
}

func (User) TableName() string { return "users" }

func (u *User) IsDisabled() bool {
	return u != nil && u.DisabledAt != nil
}
