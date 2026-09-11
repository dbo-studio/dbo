package model

import "time"

type UserRole string

const (
	UserRoleAdmin  UserRole = "admin"
	UserRoleMember UserRole = "member"
)

type User struct {
	ID                   string     `gorm:"primaryKey;column:id"`
	Email                string     `gorm:"column:email;uniqueIndex"`
	PasswordHash         string     `gorm:"column:password_hash"`
	Role                 UserRole   `gorm:"column:role"`
	PermCreateConnection bool       `gorm:"column:perm_create_connection;not null;default:false"`
	PermAiSettings       bool       `gorm:"column:perm_ai_settings;not null;default:false"`
	PermMcpSettings      bool       `gorm:"column:perm_mcp_settings;not null;default:false"`
	MustChangePassword   bool       `gorm:"column:must_change_password"`
	TotpSecretCiphertext *string    `gorm:"column:totp_secret_ciphertext"`
	TotpEnabledAt        *time.Time `gorm:"column:totp_enabled_at"`
	DisabledAt           *time.Time `gorm:"column:disabled_at"`
	CreatedAt            time.Time  `gorm:"column:created_at"`
	UpdatedAt            time.Time  `gorm:"column:updated_at"`
}

func (u *User) TotpEnabled() bool {
	return u != nil && u.TotpEnabledAt != nil
}

func (User) TableName() string { return "users" }

func (u *User) IsDisabled() bool {
	return u != nil && u.DisabledAt != nil
}
