package handlers

import (
	"erp-lite-backend/database"
	"erp-lite-backend/models"
	"erp-lite-backend/services"
	"fmt"
	"strconv"
	"log"
	"time"
	"os"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

const SecretKey = "erp-lite-secret-key"

// Warehouses
func GetWarehouses(c *fiber.Ctx) error {
	var warehouses []models.Warehouse
	database.DB.Find(&warehouses)
	return c.JSON(warehouses)
}

func CreateWarehouse(c *fiber.Ctx) error {
	var warehouse models.Warehouse
	if err := c.BodyParser(&warehouse); err != nil {
		return err
	}
	database.DB.Create(&warehouse)
	return c.JSON(warehouse)
}

func UpdateWarehouse(c *fiber.Ctx) error {
	id := c.Params("id")
	var warehouse models.Warehouse
	if err := database.DB.First(&warehouse, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Warehouse not found"})
	}

	var updateData models.Warehouse
	if err := c.BodyParser(&updateData); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	warehouse.Name = updateData.Name
	warehouse.Description = updateData.Description

	if err := database.DB.Save(&warehouse).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(warehouse)
}

func DeleteWarehouse(c *fiber.Ctx) error {
	id := c.Params("id")
	var warehouse models.Warehouse
	if err := database.DB.First(&warehouse, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Warehouse not found"})
	}
	
	if err := database.DB.Delete(&warehouse).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Warehouse deleted successfully"})
}

// Products
func GetProducts(c *fiber.Ctx) error {
	var products []models.Product
	database.DB.Find(&products)
	return c.JSON(products)
}

func CreateProduct(c *fiber.Ctx) error {
	var product models.Product
	if err := c.BodyParser(&product); err != nil {
		return err
	}
	database.DB.Create(&product)
	return c.JSON(product)
}

func BulkCreateProduct(c *fiber.Ctx) error {
	var products []models.Product
	if err := c.BodyParser(&products); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := database.DB.Create(&products).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Products imported successfully", "count": len(products)})
}

func UpdateProduct(c *fiber.Ctx) error {
	id := c.Params("id")
	var product models.Product
	if err := database.DB.First(&product, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Product not found"})
	}

	var updateData models.Product
	if err := c.BodyParser(&updateData); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	product.Name = updateData.Name
	product.Barcode = updateData.Barcode
	product.Unit = updateData.Unit
	product.Category = updateData.Category
	product.MinStockLevel = updateData.MinStockLevel

	if err := database.DB.Save(&product).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(product)
}

func DeleteProduct(c *fiber.Ctx) error {
	id := c.Params("id")
	var product models.Product
	if err := database.DB.First(&product, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Product not found"})
	}
	if err := database.DB.Delete(&product).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Product deleted successfully"})
}

func GetProductMovements(c *fiber.Ctx) error {
	id := c.Params("id")
	var movements []models.StockMovement
	database.DB.Preload("Product").Preload("FromWarehouse").Preload("ToWarehouse").Preload("User").Preload("Customer").Where("product_id = ?", id).Order("timestamp desc").Find(&movements)
	return c.JSON(movements)
}

func GetAllMovements(c *fiber.Ctx) error {
	limitStr := c.Query("limit", "10")
	var movements []models.StockMovement
	query := database.DB.Preload("Product").Preload("FromWarehouse").Preload("ToWarehouse").Preload("User").Preload("Customer").Preload("Supplier")
	
	if limitStr != "all" {
		l, _ := strconv.Atoi(limitStr)
		if l > 0 {
			query = query.Limit(l)
		}
	}
	
	query.Order("timestamp desc").Find(&movements)
	return c.JSON(movements)
}

// Stocks
func GetStocks(c *fiber.Ctx) error {
	var stocks []models.Stock
	database.DB.Preload("Warehouse").Preload("Product").Find(&stocks)
	return c.JSON(stocks)
}

func MoveStock(c *fiber.Ctx) error {
	var req services.StockMovementRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := services.PerformStockMovement(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Stock movement successful"})
}

func BulkMoveStock(c *fiber.Ctx) error {
	var reqs []services.StockMovementRequest
	if err := c.BodyParser(&reqs); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := services.PerformBulkStockMovement(reqs); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Bulk stock movement successful"})
}

func ProduceStock(c *fiber.Ctx) error {
	var req services.ProductionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := services.PerformProduction(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Production completed successfully"})
}

func GetSettings(c *fiber.Ctx) error {
	var settings []models.Setting
	database.DB.Find(&settings)
	settingsMap := make(map[string]string)
	for _, s := range settings {
		settingsMap[s.Key] = s.Value
	}
	return c.JSON(settingsMap)
}

func UpdateSettings(c *fiber.Ctx) error {
	var body map[string]string
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	for k, v := range body {
		var setting models.Setting
		if err := database.DB.Where("key = ?", k).First(&setting).Error; err != nil {
			setting = models.Setting{Key: k, Value: v}
			database.DB.Create(&setting)
		} else {
			setting.Value = v
			database.DB.Save(&setting)
		}
	}
	return c.JSON(fiber.Map{"message": "Settings updated"})
}

func GetRecipes(c *fiber.Ctx) error {
	var recipes []models.Recipe
	database.DB.Preload("Product").Preload("Items.Product").Find(&recipes)
	return c.JSON(recipes)
}

func GetRecipeByProduct(c *fiber.Ctx) error {
	productId := c.Params("productId")
	var recipe models.Recipe
	if err := database.DB.Preload("Product").Preload("Items.Product").Where("product_id = ?", productId).First(&recipe).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Recipe not found"})
	}
	return c.JSON(recipe)
}

func CreateOrUpdateRecipe(c *fiber.Ctx) error {
	var payload struct {
		ProductID uint `json:"product_id"`
		ImagePath string `json:"image_path"`
		Items []struct {
			ProductID uint `json:"product_id"`
			Quantity float64 `json:"quantity"`
		} `json:"items"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	var recipe models.Recipe
	if err := database.DB.Where("product_id = ?", payload.ProductID).First(&recipe).Error; err != nil {
		recipe = models.Recipe{ProductID: payload.ProductID, ImagePath: payload.ImagePath}
		database.DB.Create(&recipe)
	} else {
		recipe.ImagePath = payload.ImagePath
		database.DB.Save(&recipe)
	}

	// Delete old items
	database.DB.Where("recipe_id = ?", recipe.ID).Delete(&models.RecipeItem{})

	// Add new items
	for _, item := range payload.Items {
		database.DB.Create(&models.RecipeItem{
			RecipeID: recipe.ID,
			ProductID: item.ProductID,
			Quantity: item.Quantity,
		})
	}

	return c.JSON(fiber.Map{"message": "Recipe saved successfully"})
}

func DeleteRecipe(c *fiber.Ctx) error {
	id := c.Params("id")
	database.DB.Delete(&models.Recipe{}, id)
	return c.JSON(fiber.Map{"message": "Recipe deleted"})
}

// Notification Rules
func GetNotificationRules(c *fiber.Ctx) error {
	var rules []models.NotificationRule
	database.DB.Find(&rules)
	return c.JSON(rules)
}

func CreateNotificationRule(c *fiber.Ctx) error {
	var rule models.NotificationRule
	if err := c.BodyParser(&rule); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	database.DB.Create(&rule)
	return c.JSON(rule)
}

func UpdateNotificationRule(c *fiber.Ctx) error {
	id := c.Params("id")
	var rule models.NotificationRule
	if err := database.DB.First(&rule, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Rule not found"})
	}
	if err := c.BodyParser(&rule); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	database.DB.Save(&rule)
	return c.JSON(rule)
}

func DeleteNotificationRule(c *fiber.Ctx) error {
	id := c.Params("id")
	database.DB.Delete(&models.NotificationRule{}, id)
	return c.JSON(fiber.Map{"message": "Rule deleted"})
}

func TestNotificationRule(c *fiber.Ctx) error {
	id := c.Params("id")
	var rule models.NotificationRule
	if err := database.DB.First(&rule, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Rule not found"})
	}

	dummyData := map[string]interface{}{
		"ID":            "123",
		"PRODUCT":       "TEST ÜRÜNÜ",
		"STATUS":        "TAMAMLANDI",
		"CUSTOMER":      "ÖRNEK MÜŞTERİ",
		"SUPPLIER":      "ÖRNEK TEDARİKÇİ",
		"QUANTITY":      "50",
		"RAW_MATERIALS": "<div style='background:#f0f9ff; padding:10px; border-radius:5px; margin-bottom:10px; border:1px solid #bae6fd;'><h4 style='margin:0; color:#0369a1;'>Üretim Akış Detayı</h4><p style='margin:2px 0; font-size:12px;'><b>Durum:</b> TEST / PLANLANDI</p><p style='margin:2px 0; font-size:12px;'><b>Kaynak:</b> Ana Depo</p></div><h4 style='margin-bottom:5px;'>Hammadde İhtiyaç Analizi</h4><table style='width:100%; border-collapse: collapse; font-size: 12px; border: 1px solid #ddd;'><tr style='background:#f5f5f5;'><th>Hammadde</th><th>Miktar</th><th>Durum</th></tr><tr><td>Örnek Hammadde A</td><td>10.00</td><td>Yeterli</td></tr><tr><td>Örnek Hammadde B</td><td>5.00</td><td>Eksik</td></tr></table>",
	}

	services.Notifier.Trigger(rule.FlowName, rule.TriggerEvent, rule.TargetStatus, dummyData)
	return c.JSON(fiber.Map{"message": "Test triggered"})
}


// Customers
func GetCustomers(c *fiber.Ctx) error {
	var customers []models.Customer
	database.DB.Find(&customers)
	return c.JSON(customers)
}

func CreateCustomer(c *fiber.Ctx) error {
	var customer models.Customer
	if err := c.BodyParser(&customer); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	database.DB.Create(&customer)
	return c.JSON(customer)
}

func UpdateCustomer(c *fiber.Ctx) error {
	id := c.Params("id")
	var customer models.Customer
	if err := database.DB.First(&customer, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Customer not found"})
	}
	if err := c.BodyParser(&customer); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	database.DB.Save(&customer)
	return c.JSON(customer)
}

func DeleteCustomer(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := database.DB.Delete(&models.Customer{}, id).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Bu müşteri silinemiyor (Satış kaydı olabilir): " + err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Customer deleted"})
}

func BulkCreateCustomers(c *fiber.Ctx) error {
	var customers []models.Customer
	if err := c.BodyParser(&customers); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input: " + err.Error()})
	}

	log.Printf("Bulk import: %d customers received", len(customers))
	for _, cust := range customers {
		// Basic duplicate check by name before insert
		var existing models.Customer
		if err := database.DB.Where("name = ?", cust.Name).First(&existing).Error; err != nil {
			database.DB.Create(&cust)
		}
	}
	return c.JSON(fiber.Map{"message": "Bulk import completed"})
}

// Sales
func CreateSale(c *fiber.Ctx) error {
	var req services.SaleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	if err := services.PerformSale(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Sale completed successfully"})
}

func GetSales(c *fiber.Ctx) error {
	var sales []models.Sale
	database.DB.Preload("Customer").Preload("Items.Product").Preload("Items.Warehouse").Order("created_at desc").Find(&sales)
	return c.JSON(sales)
}

func ShipSale(c *fiber.Ctx) error {
	id, _ := c.ParamsInt("id")
	if err := services.ShipSale(uint(id), 1); err != nil { // Default user ID 1 for now
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Shipment completed and stock deducted"})
}

func CancelSale(c *fiber.Ctx) error {
	id, _ := c.ParamsInt("id")
	if err := services.CancelSale(uint(id), 1); err != nil { // Default user ID 1 for now
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Sale cancelled and stock reversed"})
}

// Suppliers
func GetSuppliers(c *fiber.Ctx) error {
	var suppliers []models.Supplier
	database.DB.Find(&suppliers)
	return c.JSON(suppliers)
}

func CreateSupplier(c *fiber.Ctx) error {
	var supplier models.Supplier
	if err := c.BodyParser(&supplier); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	database.DB.Create(&supplier)
	return c.JSON(supplier)
}

func UpdateSupplier(c *fiber.Ctx) error {
	id := c.Params("id")
	var supplier models.Supplier
	if err := database.DB.First(&supplier, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Supplier not found"})
	}
	if err := c.BodyParser(&supplier); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	database.DB.Save(&supplier)
	return c.JSON(supplier)
}

func DeleteSupplier(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := database.DB.Delete(&models.Supplier{}, id).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Bu tedarikçi silinemiyor: " + err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Supplier deleted"})
}

// Purchases
func GetPurchases(c *fiber.Ctx) error {
	var purchases []models.Purchase
	database.DB.Preload("Supplier").Preload("Items.Product").Preload("Items.Warehouse").Preload("Items.Supplier").Order("purchase_date desc").Find(&purchases)
	return c.JSON(purchases)
}

func UpdatePurchaseStatus(c *fiber.Ctx) error {
	id, _ := c.ParamsInt("id")
	type Req struct {
		Status string `json:"status"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid status"})
	}

	if err := database.DB.Model(&models.Purchase{}).Where("id = ?", id).Update("status", req.Status).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Durum değişimi bildirimini tetikle
	var purchase models.Purchase
	database.DB.Preload("Items.Product").First(&purchase, id)
	services.Notifier.Trigger("PURCHASE", "STATUS_CHANGED", req.Status, map[string]interface{}{
		"ID":             purchase.ID,
		"STATUS":         req.Status,
		"TOTAL":          purchase.TotalPrice,
		"NOTE":           purchase.Note,
		"PLANLAMA_NOTU":  purchase.Note,
		"PURCHASE_ITEMS": services.GetPurchaseItemsHTML(purchase),
	})

	return c.JSON(fiber.Map{"message": "Sipariş durumu güncellendi"})
}

func PlaceOrder(c *fiber.Ctx) error {
	id, _ := c.ParamsInt("id")
	type Req struct {
		ItemSuppliers map[uint]uint `json:"item_suppliers"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid body"})
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		var purchase models.Purchase
		if err := tx.Preload("Items.Product").First(&purchase, id).Error; err != nil {
			return err
		}

		if purchase.Status != "Hazırlanıyor" {
			return fmt.Errorf("bu sipariş zaten verilmiş veya iptal edilmiş")
		}

		var firstSupplierID uint

		// Update items with their assigned suppliers
		for i := range purchase.Items {
			item := &purchase.Items[i]
			supplierID, ok := req.ItemSuppliers[item.ID]
			if !ok || supplierID == 0 {
				continue 
			}
			if firstSupplierID == 0 {
				firstSupplierID = supplierID
			}
			if err := tx.Model(&models.PurchaseItem{}).Where("id = ?", item.ID).Update("supplier_id", supplierID).Error; err != nil {
				return err
			}
		}

		// Update Purchase Status and set a primary supplier for fallback
		updates := map[string]interface{}{
			"status": "Sipariş Verildi",
		}
		if firstSupplierID != 0 {
			updates["supplier_id"] = firstSupplierID
		}

		if err := tx.Model(&purchase).Updates(updates).Error; err != nil {
			return err
		}

		// Trigger Notification
		var supplier models.Supplier
		if firstSupplierID != 0 {
			tx.First(&supplier, firstSupplierID)
		}
		services.Notifier.Trigger("PURCHASE", "STATUS_CHANGED", "Sipariş Verildi", map[string]interface{}{
			"ID":             purchase.ID,
			"SUPPLIER":       supplier.Name, // This will be the first supplier
			"STATUS":         "Sipariş Verildi",
			"TOTAL":          purchase.TotalPrice,
			"NOTE":           purchase.Note,
			"PLANLAMA_NOTU":  purchase.Note,
			"PURCHASE_ITEMS": services.GetPurchaseItemsHTML(purchase),
		})

		return c.JSON(fiber.Map{"message": "Sipariş başarıyla verildi"})
	})
}

func CreatePurchase(c *fiber.Ctx) error {
	var req services.PurchaseRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid body"})
	}

	if err := services.PerformPurchase(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Purchase order created successfully"})
}

func ReceivePurchase(c *fiber.Ctx) error {
	id, _ := c.ParamsInt("id")
	
	type Req struct {
		Items []services.PurchaseReceiptItem `json:"items"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid body"})
	}

	if err := services.CompletePurchase(uint(id), 1, req.Items); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Goods received successfully"})
}

func CancelPurchase(c *fiber.Ctx) error {
	id, _ := c.ParamsInt("id")
	var purchase models.Purchase
	if err := database.DB.First(&purchase, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Not found"})
	}
	if purchase.Status != "Hazırlanıyor" && purchase.Status != "Sipariş Verildi" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Sadece hazırlanan veya yoldaki siparişler iptal edilebilir"})
	}
	database.DB.Model(&purchase).Update("status", "İptal")
	return c.JSON(fiber.Map{"message": "Order cancelled"})
}

// Work Orders
func GetWorkOrders(c *fiber.Ctx) error {
	var wos []models.WorkOrder
	database.DB.Preload("Product").Preload("SourceWarehouse").Preload("TargetWarehouse").Order("id desc").Find(&wos)
	return c.JSON(wos)
}

func CreateWorkOrder(c *fiber.Ctx) error {
	var wo models.WorkOrder
	if err := c.BodyParser(&wo); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid body"})
	}
	if err := services.CreateWorkOrder(wo); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(wo)
}

func UpdateWorkOrderStatus(c *fiber.Ctx) error {
	id, _ := c.ParamsInt("id")
	type Req struct {
		Status string `json:"status"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid status"})
	}

	if err := services.ProcessWorkOrder(uint(id), req.Status); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Work order updated"})
}

func DeleteWorkOrder(c *fiber.Ctx) error {
	id, _ := c.ParamsInt("id")
	if err := services.DeleteWorkOrder(uint(id)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Work order deleted"})
}

func GetWorkOrderRequirements(c *fiber.Ctx) error {
	id, _ := c.ParamsInt("id")
	var wo models.WorkOrder
	if err := database.DB.First(&wo, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Work order not found"})
	}

	var recipe models.Recipe
	if err := database.DB.Preload("Items.Product").Where("product_id = ?", wo.ProductID).First(&recipe).Error; err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Reçete bulunamadı"})
	}

	type Requirement struct {
		ProductID   uint    `json:"product_id"`
		ProductName string  `json:"product_name"`
		Required    float64 `json:"required"`
		InStock     float64 `json:"in_stock"`
		Status      string  `json:"status"` // 'OK', 'SHORT'
	}

	var requirements []Requirement
	for _, item := range recipe.Items {
		var stock models.Stock
		database.DB.Where("warehouse_id = ? AND product_id = ?", wo.SourceWarehouseID, item.ProductID).First(&stock)
		
		status := "OK"
		needed := item.Quantity * wo.Quantity
		if stock.Quantity < needed {
			status = "SHORT"
		}

		requirements = append(requirements, Requirement{
			ProductID:   item.ProductID,
			ProductName: item.Product.Name,
			Required:    needed,
			InStock:     stock.Quantity,
			Status:      status,
		})
	}

	return c.JSON(requirements)
}

// Quotes
func GetQuotes(c *fiber.Ctx) error {
	var quotes []models.Quote
	database.DB.Preload("Customer").Preload("IssuingCompany").Preload("Items.Product").Order("created_at desc").Find(&quotes)
	return c.JSON(quotes)
}

func CreateQuote(c *fiber.Ctx) error {
	var quote models.Quote
	if err := c.BodyParser(&quote); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid body"})
	}

	// Generate Quote Number (TF-YEAR-ID)
	var lastQuote models.Quote
	database.DB.Order("id desc").First(&lastQuote)
	year := time.Now().Year()
	nextID := lastQuote.ID + 1
	quote.QuoteNumber = fmt.Sprintf("TF-%d-%03d", year, nextID)
	quote.QuoteDate = time.Now()

	if err := database.DB.Create(&quote).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	
	// Notification
	var customer models.Customer
	database.DB.First(&customer, quote.CustomerID)
	services.Notifier.Trigger("QUOTE", "CREATED", "", map[string]interface{}{
		"ID":            quote.ID,
		"CUSTOMER":      customer.Name,
		"TOTAL":         quote.TotalPrice,
		"NOTE":          quote.Note,
		"PLANLAMA_NOTU": quote.Note,
	})

	return c.JSON(quote)
}

func UpdateQuote(c *fiber.Ctx) error {
	id := c.Params("id")
	var existingQuote models.Quote
	if err := database.DB.First(&existingQuote, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Quote not found"})
	}

	var updateData models.Quote
	if err := c.BodyParser(&updateData); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid body"})
	}

	// Delete old items
	database.DB.Where("quote_id = ?", id).Delete(&models.QuoteItem{})

	// Update main fields
	existingQuote.CustomerID = updateData.CustomerID
	existingQuote.ValidUntil = updateData.ValidUntil
	existingQuote.SubTotal = updateData.SubTotal
	existingQuote.TaxTotal = updateData.TaxTotal
	existingQuote.TotalPrice = updateData.TotalPrice
	existingQuote.Note = updateData.Note
	existingQuote.Currency = updateData.Currency
	existingQuote.IssuingCompanyID = updateData.IssuingCompanyID
	existingQuote.Items = updateData.Items

	if err := database.DB.Save(&existingQuote).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(existingQuote)
}

func GetQuote(c *fiber.Ctx) error {
	id := c.Params("id")
	var quote models.Quote
	if err := database.DB.Preload("Customer").Preload("IssuingCompany").Preload("Items.Product").First(&quote, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Quote not found"})
	}
	return c.JSON(quote)
}

func UpdateQuoteStatus(c *fiber.Ctx) error {
	id, _ := c.ParamsInt("id")
	type Req struct {
		Status string `json:"status"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid status"})
	}
	database.DB.Model(&models.Quote{}).Where("id = ?", id).Update("status", req.Status)
	
	// Notification
	var quote models.Quote
	database.DB.Preload("Customer").First(&quote, id)
	services.Notifier.Trigger("QUOTE", "STATUS_CHANGED", req.Status, map[string]interface{}{
		"ID":            quote.ID,
		"CUSTOMER":      quote.Customer.Name,
		"STATUS":        req.Status,
		"NOTE":          quote.Note,
		"PLANLAMA_NOTU": quote.Note,
	})

	return c.JSON(fiber.Map{"message": "Quote status updated"})
}

func ConvertQuoteToSale(c *fiber.Ctx) error {
	id, _ := c.ParamsInt("id")
	type Req struct {
		WarehouseID uint `json:"warehouse_id"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid warehouse"})
	}

	if err := services.ConvertQuoteToSale(uint(id), req.WarehouseID, 1); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Quote converted to sale successfully"})
}

func GetIssuingCompanies(c *fiber.Ctx) error {
	var companies []models.IssuingCompany
	database.DB.Find(&companies)
	return c.JSON(companies)
}

func CreateIssuingCompany(c *fiber.Ctx) error {
	var company models.IssuingCompany
	if err := c.BodyParser(&company); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid body"})
	}
	database.DB.Create(&company)
	return c.JSON(company)
}

func UpdateIssuingCompany(c *fiber.Ctx) error {
	id, _ := c.ParamsInt("id")
	var company models.IssuingCompany
	if err := database.DB.First(&company, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Company not found"})
	}
	if err := c.BodyParser(&company); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid body"})
	}
	database.DB.Save(&company)
	return c.JSON(company)
}

func DeleteIssuingCompany(c *fiber.Ctx) error {
	id, _ := c.ParamsInt("id")
	database.DB.Delete(&models.IssuingCompany{}, id)
	return c.JSON(fiber.Map{"message": "Company deleted"})
}

func UploadImage(c *fiber.Ctx) error {
	file, err := c.FormFile("image")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Resim yüklenemedi"})
	}

	// Create uploads directory if not exists
	if _, err := os.Stat("uploads"); os.IsNotExist(err) {
		os.Mkdir("uploads", 0755)
	}

	filename := fmt.Sprintf("%d_%s", time.Now().Unix(), file.Filename)
	path := fmt.Sprintf("uploads/%s", filename)

	if err := c.SaveFile(file, path); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Dosya kaydedilemedi"})
	}

	return c.JSON(fiber.Map{"path": path})
}
