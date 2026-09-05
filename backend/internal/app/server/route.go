package server

import (
	"github.com/gofiber/fiber/v3/middleware/static"

	"github.com/dbo-studio/dbo/internal/app/server/middleware"
)

func (r *Server) routing() {
	api := r.app.Group("/api")

	clearBody := middleware.SkipClearRequestBody()

	api.Get("/config", r.handlers.Config.Config)
	api.Get("/config/check-update", r.handlers.Config.CheckUpdate)
	api.Get("/config/logs", r.handlers.Config.Logs)
	api.Post("/config/reset", r.handlers.Config.ResetFactory)

	schema := api.Group("schema")
	schema.Get("/diagram", r.handlers.Schema.Diagram)

	tree := api.Group("tree")
	tree.Get("/", r.handlers.TreeHandler.TreeHandler)
	tree.Get("/:nodeId/tabs/:action", r.handlers.TreeHandler.Tabs)
	tree.Get("/:nodeId/tabs/:action/fields/:tabId/object", r.handlers.TreeHandler.ObjectDetail)
	tree.Get("/:nodeId/dynamic", r.handlers.TreeHandler.GetDynamicFieldOptions)
	tree.Post("/:nodeId/tabs/:action/fields/object", clearBody, r.handlers.TreeHandler.ExecuteHandler)
	tree.Post("/:nodeId/tabs/:action/fields/object/preview", clearBody, r.handlers.TreeHandler.PreviewExecuteHandler)

	query := api.Group("query")
	query.Post("/run", clearBody, r.handlers.QueryHandler.Run)
	query.Post("/raw", clearBody, r.handlers.QueryHandler.Raw)
	query.Post("/update", clearBody, r.handlers.QueryHandler.Update)
	query.Get("/autocomplete", r.handlers.QueryHandler.Autocomplete)

	ai := api.Group("ai")
	ai.Post("/chat", r.handlers.AI.Chat)
	ai.Post("/chat/stream", r.handlers.AI.ChatStream)
	ai.Post("/complete", r.handlers.AI.Complete)

	aiProvider := ai.Group("providers")
	aiProvider.Get("/", r.handlers.AiProvider.Providers)
	aiProvider.Patch("/:id", r.handlers.AiProvider.Update)

	aiChat := ai.Group("chats")
	aiChat.Get("/", r.handlers.AiChat.Chats)
	aiChat.Post("/", r.handlers.AiChat.Create)
	aiChat.Get("/:id", r.handlers.AiChat.Detail)
	aiChat.Delete("/:id", r.handlers.AiChat.Delete)

	mcp := api.Group("mcp")
	mcp.Get("/status", r.handlers.Mcp.Status)
	mcp.Post("/update", r.handlers.Mcp.Update)
	mcp.Post("/regenerate-token", r.handlers.Mcp.RegenerateToken)
	// The catch-all proxy must stay registered after every concrete mcp
	// route; MCP clients authenticate with their own bearer token.
	mcp.All("/", r.handlers.Mcp.Proxy)
	mcp.All("/*", r.handlers.Mcp.Proxy)

	safeMode := api.Group("safe-mode")
	safeMode.Get("/password", r.handlers.SafeMode.Status)
	safeMode.Post("/password", r.handlers.SafeMode.SetPassword)
	safeMode.Patch("/password", r.handlers.SafeMode.ChangePassword)
	safeMode.Post("/verify", r.handlers.SafeMode.Verify)

	connection := api.Group("connections")
	connection.Get("/", r.handlers.Connection.Connections)
	connection.Post("/", r.handlers.Connection.Create)
	connection.Post("/ping", r.handlers.Connection.Ping)
	connection.Patch("/:id", r.handlers.Connection.Update)
	connection.Post("/:id/credentials", r.handlers.Connection.SetCredentials)
	connection.Post("/:id/safe-mode/unlock", r.handlers.Connection.UnlockSafeMode)
	connection.Post("/:id/safe-mode/lock", r.handlers.Connection.LockSafeMode)
	connection.Delete("/:id", r.handlers.Connection.Delete)

	saved := api.Group("saved")
	saved.Get("/", r.handlers.SavedQuery.SavedQueries)
	saved.Post("/", r.handlers.SavedQuery.Create)
	saved.Patch("/:id", r.handlers.SavedQuery.Update)
	saved.Delete("/:id", r.handlers.SavedQuery.Delete)

	history := api.Group("histories")
	history.Get("/", r.handlers.History.Histories)
	history.Delete("/", r.handlers.History.Delete)

	api.Post("/import", r.handlers.ImportExport.Start)
	api.Post("/export", r.handlers.ImportExport.Export)

	job := api.Group("jobs")
	job.Get("/:id", r.handlers.Job.Detail)
	job.Delete("/:id", r.handlers.Job.Cancel)
	job.Get("/:id/result", r.handlers.Job.Result)

	// The SPA catch-all is registered last so it can never shadow an API
	// route regardless of registration order.
	r.app.Get("/*", static.New("out"))
}
