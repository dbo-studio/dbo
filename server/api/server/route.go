package server

func (r *Server) routing() {
	api := r.app.Group("/api")
	api.Post("/query", r.queryHandler.RunQuery)

	api.Get("/connections/:id", r.connectionHandler.Connection)
	api.Get("/connections", r.connectionHandler.Connections)
	api.Post("/connections", r.connectionHandler.AddConnection)
	api.Post("/connections/test", r.connectionHandler.TestConnection)
	api.Patch("/connections/:id", r.connectionHandler.UpdateConnection)
	api.Delete("/connections/:id", r.connectionHandler.DeleteConnection)
}
