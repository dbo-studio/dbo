package server

import "github.com/gofiber/fiber/v3/middleware/static"

func (r *Server) routing() {
	r.app.Get("/*", static.New("out"))

	api := r.app.Group("/api")

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

	ai.Get("/provider", r.handlers.AIProfile.Index)
	ai.Post("/provider", r.handlers.AIProfile.Create)
	ai.Patch("/provider", r.handlers.AIProfile.Update)
	ai.Delete("/provider/:id", r.handlers.AIProfile.Delete)

	ai.Get("/threads", r.handlers.AIThread.List)
	ai.Post("/threads", r.handlers.AIThread.Create)
	ai.Delete("/threads/:id", r.handlers.AIThread.Delete)
	ai.Get("/threads/:id/messages", r.handlers.AIThread.Messages)
	ai.Post("/threads/:id/messages", r.handlers.AIThread.AddMessage)

	connection := api.Group("connections")
	connection.Get("/:id", r.handlers.Connection.Detail)
	connection.Get("/", r.handlers.Connection.Connections)
	connection.Post("/", r.handlers.Connection.Create)
	connection.Post("/ping", r.handlers.Connection.Ping)
	connection.Patch("/:id", r.handlers.Connection.Update)
	connection.Delete("/:id", r.handlers.Connection.Delete)

	saved := api.Group("saved")
	saved.Get("/", r.handlers.SavedQuery.Index)
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

}
