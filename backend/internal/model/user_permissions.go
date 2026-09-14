package model

type UserPermissionFlags struct {
	CreateConnection bool
	AiSettings       bool
	McpSettings      bool
}

func (u *User) PermissionFlags() UserPermissionFlags {
	if u == nil || u.Role == UserRoleAdmin {
		return DefaultAdminPermissionFlags()
	}

	return UserPermissionFlags{
		CreateConnection: u.PermCreateConnection,
		AiSettings:       u.PermAiSettings,
		McpSettings:      u.PermMcpSettings,
	}
}

func DefaultMemberPermissionFlags() UserPermissionFlags {
	return UserPermissionFlags{
		CreateConnection: false,
		AiSettings:       true,
		McpSettings:      false,
	}
}

func DefaultAdminPermissionFlags() UserPermissionFlags {
	return UserPermissionFlags{
		CreateConnection: true,
		AiSettings:       true,
		McpSettings:      true,
	}
}

func ApplyPermissionFlags(u *User, flags UserPermissionFlags) {
	if u == nil {
		return
	}

	u.PermCreateConnection = flags.CreateConnection
	u.PermAiSettings = flags.AiSettings
	u.PermMcpSettings = flags.McpSettings
}
