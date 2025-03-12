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
	tree.Post("/execute", r.handlers.TreeHandler.ExecuteHandler)

	query := api.Group("query")
	query.Post("/run", r.handlers.QueryHandler.Run)
	query.Post("/raw", r.handlers.QueryHandler.Raw)
	query.Post("/update", r.handlers.QueryHandler.Update)
	query.Get("/autocomplete", r.handlers.Query.Autocomplete)

	connection := api.Group("connections")
	connection.Get("/:id", r.handlers.Connection.ConnectionDetail)
	connection.Get("/", r.handlers.Connection.Connections)
	connection.Post("/", r.handlers.Connection.CreateConnection)
	connection.Post("/test", r.handlers.Connection.TestConnection)
	connection.Patch("/:id", r.handlers.Connection.UpdateConnection)
	connection.Delete("/:id", r.handlers.Connection.DeleteConnection)

	database := api.Group("databases")
	database.Get("/metadata", r.handlers.Database.MetaData)
	database.Post("/", r.handlers.Database.CreateDatabase)
	database.Delete("/", r.handlers.Database.DeleteDatabase)

	design := api.Group("design")
	design.Patch("/", r.handlers.Design.UpdateDesign)
	design.Get("/columns", r.handlers.Design.ColumnList)
	design.Get("/indexes", r.handlers.Design.IndexList)

	saved := api.Group("saved")
	saved.Get("/", r.handlers.SavedQuery.Index)
	saved.Post("/", r.handlers.SavedQuery.Create)
	saved.Patch("/:id", r.handlers.SavedQuery.Update)
	saved.Delete("/:id", r.handlers.SavedQuery.Delete)

	history := api.Group("histories")
	history.Get("/", r.handlers.History.Histories)
}
