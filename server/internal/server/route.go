package server

func (r *Server) routing() {
	api := r.app.Group("/api")
	api.Post("/query", r.handlers.RunQuery)
}
