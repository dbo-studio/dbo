package model

import "github.com/dbo-studio/dbo/internal/app/dto"

func (u *User) EffectivePermissions() dto.UserPermissions {
	if u == nil || u.Role == UserRoleAdmin {
		return dto.UserPermissions{
			CreateConnection: true,
			AiSettings:       true,
			McpSettings:      true,
		}
	}

	return dto.UserPermissions{
		CreateConnection: u.PermCreateConnection,
		AiSettings:       u.PermAiSettings,
		McpSettings:      u.PermMcpSettings,
	}
}

func DefaultMemberPermissions() dto.UserPermissions {
	return dto.UserPermissions{
		CreateConnection: false,
		AiSettings:       true,
		McpSettings:      false,
	}
}

func DefaultAdminPermissions() dto.UserPermissions {
	return dto.UserPermissions{
		CreateConnection: true,
		AiSettings:       true,
		McpSettings:      true,
	}
}

func ApplyPermissions(u *User, perms *dto.UserPermissions) {
	if u == nil || perms == nil {
		return
	}

	u.PermCreateConnection = perms.CreateConnection
	u.PermAiSettings = perms.AiSettings
	u.PermMcpSettings = perms.McpSettings
}
