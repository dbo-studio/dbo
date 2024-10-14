package pgsql

func (p pgsql) registerRoutes() {
	p.app.Get("/pgsql/databases", nil)
	p.app.Get("/pgsql/databases/:id", nil)
	p.app.Get("/pgsql/databases/:id/tables", nil)
	p.app.Get("/pgsql/schemas/:id/views", nil)
	p.app.Get("/pgsql/schemas/:id/materialized-views", nil)
	p.app.Get("/pgsql/schemas/:id/functions", nil)
}
