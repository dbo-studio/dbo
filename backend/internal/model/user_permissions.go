package model

type UserPermissionFlags struct {
	CreateConnection bool
	AiSettings       bool
	McpSettings      bool
	// Cli opens a database terminal; it is never granted by default.
	Cli bool
	// Import, Export and AiUse gate those features for the user.
	Import bool
	Export bool
	AiUse  bool
}

func (u *User) PermissionFlags() UserPermissionFlags {
	if u == nil || u.Role == UserRoleAdmin {
		return DefaultAdminPermissionFlags()
	}

	return UserPermissionFlags{
		CreateConnection: u.PermCreateConnection,
		AiSettings:       u.PermAiSettings,
		McpSettings:      u.PermMcpSettings,
		Cli:              u.PermCli,
		Import:           u.PermImport,
		Export:           u.PermExport,
		AiUse:            u.PermAiUse,
	}
}

func DefaultMemberPermissionFlags() UserPermissionFlags {
	return UserPermissionFlags{
		CreateConnection: false,
		AiSettings:       true,
		McpSettings:      false,
		Cli:              false,
		Import:           true,
		Export:           true,
		AiUse:            true,
	}
}

func DefaultAdminPermissionFlags() UserPermissionFlags {
	return UserPermissionFlags{
		CreateConnection: true,
		AiSettings:       true,
		McpSettings:      true,
		Cli:              true,
		Import:           true,
		Export:           true,
		AiUse:            true,
	}
}

func ApplyPermissionFlags(u *User, flags UserPermissionFlags) {
	if u == nil {
		return
	}

	u.PermCreateConnection = flags.CreateConnection
	u.PermAiSettings = flags.AiSettings
	u.PermMcpSettings = flags.McpSettings
	u.PermCli = flags.Cli
	u.PermImport = flags.Import
	u.PermExport = flags.Export
	u.PermAiUse = flags.AiUse
}
