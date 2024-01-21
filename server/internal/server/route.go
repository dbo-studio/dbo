package server

func (r *Server) routing() {
	api := r.app.Group("/api")
	api.Post("/query", r.queryHandler.RunQuery)

	api.Post("/connections", r.connectionHandler.AddConnection)
	api.Patch("/connections", r.connectionHandler.UpdateConnection)
	api.Delete("/connections", r.connectionHandler.DeleteConnection)
}
