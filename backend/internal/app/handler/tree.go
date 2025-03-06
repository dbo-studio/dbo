package handler

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	serviceTree "github.com/dbo-studio/dbo/internal/service/tree"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/logger"
	"github.com/dbo-studio/dbo/pkg/response"
	"github.com/gofiber/fiber/v3"
)

type TreeHandler struct {
	logger      logger.Logger
	treeService serviceTree.ITreeService
}

func NewTreeHandler(logger logger.Logger, treeService serviceTree.ITreeService) *TreeHandler {
	return &TreeHandler{logger, treeService}
}

func (h *TreeHandler) TreeHandler(c fiber.Ctx) error {
	req := new(dto.TreeListRequest)
	if err := c.Bind().Query(req); err != nil {
		return response.ErrorBuilder(apperror.BadRequest(err)).Send(c)
	}

	result, err := h.treeService.Tree(c.Context(), req)
	if err != nil {
		h.logger.Error(err.Error())
		return response.ErrorBuilder(err).Send(c)
	}

	return response.SuccessBuilder(result).Send(c)
}

func (h *TreeHandler) FormFieldsHandler(c fiber.Ctx) error {
	return nil

	//connID := c.Query("conn_id")
	//action := c.Query("action")
	//if connID == "" || action == "" {
	//	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "conn_id and action are required"})
	//}
	//
	//repo, err := database.NewDatabaseRepository(databaseConnection.GetConnectionInfoFromDB(connID).DBType, connID, h.cm)
	//if err != nil {
	//	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	//}
	//
	//fields := repo.FormFields(action)
	//return c.JSON(fields)
}

func (h *TreeHandler) GetObjectHandler(c fiber.Ctx) error {
	return nil

	//connID := c.Query("conn_id")
	//nodeID := c.Query("node_id")
	//objType := c.Query("type")
	//if connID == "" || nodeID == "" || objType == "" {
	//	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "conn_id, node_id, and type are required"})
	//}
	//
	//repo, err := database.NewDatabaseRepository(databaseConnection.GetConnectionInfoFromDB(connID).DBType, connID, h.cm)
	//if err != nil {
	//	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	//}
	//
	//data, err := repo.objects(nodeID, objType)
	//if err != nil {
	//	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	//}
	//
	//return c.JSON(data)
}

func (h *TreeHandler) ExecuteHandler(c fiber.Ctx) error {
	return nil
	//var req struct {
	//	ConnID string `json:"conn_id"`
	//	Action string `json:"action"`
	//	NodeID string `json:"node_id"`
	//}
	//if err := c.Bind().Body(req); err != nil {
	//	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	//}
	//
	//if req.ConnID == "" || req.Action == "" {
	//	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "conn_id and action are required"})
	//}
	//
	//repo, err := database.NewDatabaseRepository(databaseConnection.GetConnectionInfoFromDB(req.ConnID).DBType, req.ConnID, h.cm)
	//if err != nil {
	//	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	//}
	//
	//dbType := databaseConnection.GetConnectionInfoFromDB(req.ConnID).DBType
	//switch {
	//case req.Action == "create_database" || req.Action == "create_table" || req.Action == "create_object":
	//	if dbType == "mysql" {
	//		var params interface{}
	//		switch req.Action {
	//		case "create_database":
	//			var p dto.MySQLCreateDatabaseParams
	//			if err := c.Bind().Body(p); err != nil {
	//				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	//			}
	//			params = p
	//		case "create_table":
	//			var p dto.MySQLCreateTableParams
	//			if err := c.Bind().Body(p); err != nil {
	//				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	//			}
	//			p.Name = req.NodeID + "." + p.Name
	//			params = p
	//		case "create_object":
	//			var p dto.MySQLCreateObjectParams
	//			if err := c.Bind().Body(p); err != nil {
	//				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	//			}
	//			p.Name = req.NodeID + "." + p.Name
	//			params = p
	//		}
	//		err = repo.CreateObject(params)
	//	} else if dbType == "postgresql" {
	//		var params interface{}
	//		switch req.Action {
	//		case "create_database":
	//			var p dto.PostgresCreateDatabaseParams
	//			if err := c.Bind().Body(p); err != nil {
	//				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	//			}
	//			params = p
	//		case "create_table":
	//			var p dto.PostgresCreateTableParams
	//			if err := c.Bind().Body(p); err != nil {
	//				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	//			}
	//			p.Name = req.NodeID + "." + p.Name
	//			params = p
	//		case "create_object":
	//			var p dto.PostgresCreateObjectParams
	//			if err := c.Bind().Body(p); err != nil {
	//				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	//			}
	//			p.Name = req.NodeID + "." + p.Name
	//			params = p
	//		}
	//		err = repo.CreateObject(params)
	//	}
	//case req.Action == "drop_database" || req.Action == "drop_table" || req.Action == "drop_object":
	//	if dbType == "mysql" {
	//		var params interface{}
	//		switch req.Action {
	//		case "drop_database":
	//			var p dto.MySQLDropDatabaseParams
	//			if err := c.Bind().Body(p); err != nil {
	//				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	//			}
	//			params = p
	//		case "drop_table", "drop_object":
	//			var p dto.DropTableParams
	//			if err := c.Bind().Body(p); err != nil {
	//				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	//			}
	//			p.Name = req.NodeID
	//			params = p
	//		}
	//		err = repo.DropObject(params)
	//	} else if dbType == "postgresql" {
	//		var params interface{}
	//		switch req.Action {
	//		case "drop_database":
	//			var p dto.PostgresDropDatabaseParams
	//			if err := c.Bind().Body(p); err != nil {
	//				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	//			}
	//			params = p
	//		case "drop_table", "drop_object":
	//			var p dto.DropTableParams
	//			if err := c.Bind().Body(p); err != nil {
	//				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	//			}
	//			p.Name = req.NodeID
	//			params = p
	//		}
	//		err = repo.DropObject(params)
	//	}
	//case req.Action == "edit_table" || req.Action == "edit_view" || req.Action == "edit_materialized_view":
	//	if dbType == "mysql" {
	//		var params interface{}
	//		switch req.Action {
	//		case "edit_table":
	//			var p dto.MySQLUpdateTableParams
	//			if err := c.Bind().Body(p); err != nil {
	//				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	//			}
	//			p.OldName = req.NodeID
	//			params = p
	//		case "edit_view":
	//			var p dto.MySQLUpdateObjectParams
	//			if err := c.Bind().Body(p); err != nil {
	//				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	//			}
	//			p.Name = req.NodeID
	//			params = p
	//		}
	//		err = repo.UpdateObject(params)
	//	} else if dbType == "postgresql" {
	//		var params interface{}
	//		switch req.Action {
	//		case "edit_table":
	//			var p dto.PostgresUpdateTableParams
	//			if err := c.Bind().Body(p); err != nil {
	//				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	//			}
	//			p.OldName = req.NodeID
	//			params = p
	//		case "edit_view", "edit_materialized_view":
	//			var p dto.PostgresUpdateObjectParams
	//			if err := c.Bind().Body(p); err != nil {
	//				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	//			}
	//			p.Name = req.NodeID
	//			params = p
	//		}
	//		err = repo.UpdateObject(params)
	//	}
	//default:
	//	err = fmt.Errorf("unknown action: %s", req.Action)
	//}
	//if err != nil {
	//	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	//}
	//return c.JSON(fiber.Map{"message": "Success"})
}

func (h *TreeHandler) QueryHandler(c fiber.Ctx) error {
	//connID := c.Query("conn_id")
	//var req struct {
	//	Query string `json:"query"`
	//}
	//if err := c.Bind().Body(req); err != nil {
	//	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	//}
	//
	//if connID == "" || req.Query == "" {
	//	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "conn_id and query are required"})
	//}
	//
	//repo, err := database.NewDatabaseRepository(databaseConnection.GetConnectionInfoFromDB(connID).DBType, connID, h.cm)
	//if err != nil {
	//	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	//}
	//
	//rows, err := repo.RunQuery(req.Query)
	//if err != nil {
	//	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	//}
	//defer rows.Close()
	//
	//var results []map[string]interface{}
	//cols, err := rows.Columns()
	//if err != nil {
	//	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	//}
	//for rows.Next() {
	//	values := make([]interface{}, len(cols))
	//	pointers := make([]interface{}, len(cols))
	//	for i := range values {
	//		pointers[i] = &values[i]
	//	}
	//	if err := rows.Scan(pointers...); err != nil {
	//		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	//	}
	//	row := make(map[string]interface{})
	//	for i, col := range cols {
	//		row[col] = values[i]
	//	}
	//	results = append(results, row)
	//}
	//return c.JSON(results)

	return nil
}
