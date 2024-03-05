package server

func (r *Server) routing() {
	api := r.app.Group("/api")

	query := api.Group("query")
	query.Post("/run", r.queryHandler.Run)
	query.Post("/raw", r.queryHandler.Raw)
	query.Post("/update", r.queryHandler.Update)
	query.Post("/delete", r.queryHandler.Delete)

	connection := api.Group("connections")
	connection.Get("/:id", r.connectionHandler.Connection)
	connection.Get("/", r.connectionHandler.Connections)
	connection.Post("/", r.connectionHandler.AddConnection)
	connection.Post("/test", r.connectionHandler.TestConnection)
	connection.Patch("/:id", r.connectionHandler.UpdateConnection)
	connection.Delete("/:id", r.connectionHandler.DeleteConnection)

	database := api.Group("databases")
	database.Get("/metadata", r.databaseHandler.DatabaseMetaData)
	database.Post("/", r.databaseHandler.AddDatabase)
	database.Delete("/", r.databaseHandler.DeleteDatabase)
}
