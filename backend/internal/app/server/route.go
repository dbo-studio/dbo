package server

import "github.com/gofiber/fiber/v3/middleware/static"

func (r *Server) routing() {
	r.app.Get("/*", static.New("out"))

	api := r.app.Group("/api")

	api.Get("/config", r.handlers.Config.Config)
	api.Get("/config/check-update", r.handlers.Config.CheckUpdate)
	api.Get("/config/logs", r.handlers.Config.Logs)

	tree := api.Group("tree")
	tree.Get("/", r.handlers.TreeHandler.TreeHandler)
	tree.Get("/:nodeId/tabs/:action", r.handlers.TreeHandler.Tabs)
	tree.Get("/:nodeId/tabs/:action/fields/:tabId", r.handlers.TreeHandler.ObjectFields)
	tree.Get("/:nodeId/tabs/:action/fields/:tabId/object", r.handlers.TreeHandler.ObjectDetail)
	tree.Post("/:nodeId/tabs/:action/fields/object", r.handlers.TreeHandler.ExecuteHandler)

	query := api.Group("query")
	query.Post("/run", r.handlers.QueryHandler.Run)
	query.Post("/raw", r.handlers.QueryHandler.Raw)
	query.Post("/update", r.handlers.QueryHandler.Update)
	query.Get("/autocomplete", r.handlers.QueryHandler.Autocomplete)

	ai := api.Group("ai")
	ai.Post("/chat", r.handlers.AI.Chat)
	ai.Post("/complete", r.handlers.AI.Complete)

	aiProvider := ai.Group("providers")
	aiProvider.Get("/", r.handlers.AiProvider.Providers)
	aiProvider.Patch("/:id", r.handlers.AiProvider.Update)

	aiChat := ai.Group("chats")
	aiChat.Get("/", r.handlers.AiChat.Chats)
	aiChat.Post("/", r.handlers.AiChat.Create)
	aiChat.Get("/:id", r.handlers.AiChat.Detail)
	aiChat.Delete("/:id", r.handlers.AiChat.Delete)

	connection := api.Group("connections")
	connection.Get("/:id", r.handlers.Connection.Detail)
	connection.Get("/", r.handlers.Connection.Connections)
	connection.Post("/", r.handlers.Connection.Create)
	connection.Post("/ping", r.handlers.Connection.Ping)
	connection.Patch("/:id", r.handlers.Connection.Update)
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

	schemaDiagram := api.Group("schema-diagram")
	schemaDiagram.Get("/", r.handlers.SchemaDiagram.GetDiagram)
	schemaDiagram.Post("/layout", r.handlers.SchemaDiagram.SaveLayout)
	schemaDiagram.Post("/relationship", r.handlers.SchemaDiagram.CreateRelationship)
	schemaDiagram.Delete("/relationship", r.handlers.SchemaDiagram.DeleteRelationship)

}
