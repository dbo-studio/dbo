package server

func (r *Server) routing() {
	r.app.Static("/", "out")

	api := r.app.Group("/api")

	query := api.Group("query")
	query.Post("/run", r.queryHandler.Run)
	query.Post("/raw", r.queryHandler.Raw)
	query.Post("/update", r.queryHandler.Update)
	query.Get("/autocomplete", r.queryHandler.Autocomplete)

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

	design := api.Group("design")
	design.Patch("/", r.designHandler.UpdateDesign)
	design.Get("/columns", r.designHandler.ColumnList)
	design.Get("/indexes", r.designHandler.IndexList)

	saved := api.Group("saved")
	saved.Get("/", r.savedQueryHandler.SavedQueries)
	saved.Post("/", r.savedQueryHandler.AddSavedQuery)
	saved.Patch("/:id", r.savedQueryHandler.UpdateSavedQuery)
	saved.Delete("/:id", r.savedQueryHandler.DeleteSavedQuery)

	history := api.Group("histories")
	history.Get("/", r.historyHandler.Histories)
}
