package config

type Client string

const (
	ClientDesktop Client = "desktop"
	ClientWeb     Client = "web"
)

type Environment string

const (
	EnvironmentLocal   Environment = "local"
	EnvironmentDocker  Environment = "docker"
	EnvironmentTesting Environment = "testing"
)
