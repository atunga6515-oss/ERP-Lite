package routes

import (
	"erp-lite-backend/handlers"

	"github.com/gofiber/fiber/v2"
)

func Setup(app *fiber.App) {
	api := app.Group("/api")
	app.Get("/uploads/*", func(c *fiber.Ctx) error {
		c.Set("Access-Control-Allow-Origin", "*")
		return c.SendFile("./uploads/" + c.Params("*"))
	})

	// Auth
	api.Post("/auth/login", handlers.Login)
	api.Post("/auth/reset-password", handlers.ResetPassword)
	api.Post("/auth/forgot-password", handlers.ForgotPassword)
	
	// User Management (Admin Only)
	api.Get("/users", handlers.GetUsers)
	api.Post("/users", handlers.CreateUser)
	api.Put("/users/:id", handlers.UpdateUser)
	api.Post("/users/:id/resend-email", handlers.ResendWelcomeEmail)
	api.Put("/users/:id/permissions", handlers.UpdateUserPermissions)

	// Protected routes would use middleware here
	// For simplicity in this ERP Lite, we add them directly or use a dummy middleware

	// Warehouses
	api.Get("/warehouses", handlers.GetWarehouses)
	api.Post("/warehouses", handlers.CreateWarehouse)
	api.Put("/warehouses/:id", handlers.UpdateWarehouse)
	api.Delete("/warehouses/:id", handlers.DeleteWarehouse)

	// Products
	api.Get("/products", handlers.GetProducts)
	api.Post("/products", handlers.CreateProduct)
	api.Post("/products/bulk", handlers.BulkCreateProduct)
	api.Put("/products/:id", handlers.UpdateProduct)
	api.Delete("/products/:id", handlers.DeleteProduct)
	api.Get("/products/:id/movements", handlers.GetProductMovements)
	api.Get("/movements", handlers.GetAllMovements)

	// Stocks
	api.Get("/stocks", handlers.GetStocks)
	api.Post("/stocks/move", handlers.MoveStock)
	api.Post("/stocks/move/bulk", handlers.BulkMoveStock)
	api.Post("/stocks/produce", handlers.ProduceStock)

	// Settings
	api.Get("/settings", handlers.GetSettings)
	api.Post("/settings", handlers.UpdateSettings)

	// Recipes (BOM)
	api.Get("/recipes", handlers.GetRecipes)
	api.Get("/recipes/product/:productId", handlers.GetRecipeByProduct)
	api.Post("/recipes", handlers.CreateOrUpdateRecipe)
	api.Delete("/recipes/:id", handlers.DeleteRecipe)

	// Customers
	api.Get("/customers", handlers.GetCustomers)
	api.Post("/customers", handlers.CreateCustomer)
	api.Put("/customers/:id", handlers.UpdateCustomer)
	api.Delete("/customers/:id", handlers.DeleteCustomer)
	api.Post("/customers/bulk", handlers.BulkCreateCustomers)

	// Sales
	api.Get("/sales", handlers.GetSales)
	api.Post("/sales", handlers.CreateSale)
	api.Post("/sales/:id/ship", handlers.ShipSale)
	api.Delete("/sales/:id", handlers.CancelSale)
	
	// Suppliers
	api.Get("/suppliers", handlers.GetSuppliers)
	api.Post("/suppliers", handlers.CreateSupplier)
	api.Put("/suppliers/:id", handlers.UpdateSupplier)
	api.Delete("/suppliers/:id", handlers.DeleteSupplier)
	
	// Purchases
	api.Get("/purchases", handlers.GetPurchases)
	api.Post("/purchases", handlers.CreatePurchase)
	api.Put("/purchases/:id/status", handlers.UpdatePurchaseStatus)
	api.Post("/purchases/:id/place-order", handlers.PlaceOrder)
	api.Post("/purchases/:id/receive", handlers.ReceivePurchase)
	api.Post("/purchases/:id/cancel", handlers.CancelPurchase)

	// Work Orders
	api.Get("/work-orders", handlers.GetWorkOrders)
	api.Post("/work-orders", handlers.CreateWorkOrder)
	api.Put("/work-orders/:id/status", handlers.UpdateWorkOrderStatus)
	api.Delete("/work-orders/:id", handlers.DeleteWorkOrder)
	api.Get("/work-orders/:id/requirements", handlers.GetWorkOrderRequirements)
	
	// Quotes
	api.Get("/quotes", handlers.GetQuotes)
	api.Get("/quotes/:id", handlers.GetQuote)
	api.Post("/quotes", handlers.CreateQuote)
	api.Put("/quotes/:id", handlers.UpdateQuote)
	api.Put("/quotes/:id/status", handlers.UpdateQuoteStatus)
	api.Post("/quotes/:id/convert", handlers.ConvertQuoteToSale)

	// Notification Rules
	api.Get("/notifications/rules", handlers.GetNotificationRules)
	api.Post("/notifications/rules", handlers.CreateNotificationRule)
	api.Put("/notifications/rules/:id", handlers.UpdateNotificationRule)
	api.Delete("/notifications/rules/:id", handlers.DeleteNotificationRule)
	api.Post("/notifications/rules/:id/test", handlers.TestNotificationRule)
	
	// Issuing Companies
	api.Get("/issuing-companies", handlers.GetIssuingCompanies)
	api.Post("/issuing-companies", handlers.CreateIssuingCompany)
	api.Put("/issuing-companies/:id", handlers.UpdateIssuingCompany)
	api.Delete("/issuing-companies/:id", handlers.DeleteIssuingCompany)

	// Utils
	api.Post("/upload", handlers.UploadImage)
}
