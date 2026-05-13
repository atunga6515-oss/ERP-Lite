package services

import (
	"errors"
	"fmt"
	"strconv"
	"time"
	"log"
	"erp-lite-backend/database"
	"erp-lite-backend/models"

	"gorm.io/gorm"
)

type StockMovementRequest struct {
	ProductID       uint    `json:"product_id"`
	FromWarehouseID *uint   `json:"from_warehouse_id"`
	ToWarehouseID   *uint   `json:"to_warehouse_id"`
	UserID          uint    `json:"user_id"`
	Quantity        float64 `json:"quantity"`
	Type            string  `json:"type"` // "Giriş", "Çıkış", "Transfer"
	Note            string  `json:"note"`
}

type ConsumedItem struct {
	ProductID       uint    `json:"product_id"`
	Quantity        float64 `json:"quantity"`
	FromWarehouseID uint    `json:"from_warehouse_id"`
}

type ProductionRequest struct {
	ProducedProductID uint           `json:"produced_product_id"`
	ProducedQuantity  float64        `json:"produced_quantity"`
	ToWarehouseID     uint           `json:"to_warehouse_id"`
	ConsumedItems     []ConsumedItem `json:"consumed_items"`
	Note              string         `json:"note"`
	UserID            uint           `json:"user_id"`
}

type SaleItemRequest struct {
	ProductID   uint    `json:"product_id"`
	WarehouseID uint    `json:"warehouse_id"`
	Quantity    float64 `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
}

type SaleRequest struct {
	CustomerID uint              `json:"customer_id"`
	Items      []SaleItemRequest `json:"items"`
	Note       string            `json:"note"`
	UserID     uint              `json:"user_id"`
	SaleDate   time.Time         `json:"sale_date"`
}

type PurchaseItemRequest struct {
	ProductID   uint    `json:"product_id"`
	SupplierID  *uint   `json:"supplier_id"`
	WarehouseID uint    `json:"warehouse_id"`
	Quantity    float64 `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
}

type PurchaseRequest struct {
	Items        []PurchaseItemRequest `json:"items"`
	Note         string                `json:"note"`
	UserID       uint                  `json:"user_id"`
	PurchaseDate time.Time             `json:"purchase_date"`
}

type PurchaseReceiptItem struct {
	ItemID   uint    `json:"item_id"`
	Received float64 `json:"received"`
}

func PerformStockMovement(req StockMovementRequest) error {
	if req.Quantity <= 0 {
		return errors.New("quantity must be greater than zero")
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		switch req.Type {
		case "Giriş":
			return handleEntry(tx, req)
		case "Çıkış":
			return handleExit(tx, req)
		case "Transfer":
			return handleTransfer(tx, req)
		default:
			return errors.New("invalid movement type")
		}
	})
}

func PerformBulkStockMovement(reqs []StockMovementRequest) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		for _, req := range reqs {
			if req.Quantity <= 0 {
				return errors.New("quantity must be greater than zero for product ID: " + strconv.Itoa(int(req.ProductID)))
			}
			var err error
			switch req.Type {
			case "Giriş":
				err = handleEntry(tx, req)
			case "Çıkış":
				err = handleExit(tx, req)
			case "Transfer":
				err = handleTransfer(tx, req)
			default:
				return errors.New("invalid movement type")
			}
			if err != nil {
				return err
			}
		}
		return nil
	})
}

func PerformProduction(req ProductionRequest) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Consume raw materials
		for _, item := range req.ConsumedItems {
			if item.Quantity <= 0 {
				return errors.New("tüketilen miktar sıfırdan büyük olmalıdır")
			}
			var stock models.Stock
			if err := tx.Preload("Product").Where("warehouse_id = ? AND product_id = ?", item.FromWarehouseID, item.ProductID).First(&stock).Error; err != nil {
				// Get product name if possible
				var prod models.Product
				database.DB.First(&prod, item.ProductID)
				return errors.New(prod.Name + " için bu depoda stok kaydı bulunamadı")
			}
			if stock.Quantity < item.Quantity {
				return errors.New("yetersiz stok: " + stock.Product.Name + " (Gereken: " + strconv.FormatFloat(item.Quantity, 'f', -1, 64) + ", Mevcut: " + strconv.FormatFloat(stock.Quantity, 'f', -1, 64) + ")")
			}
			
			oldQty := stock.Quantity
			stock.Quantity -= item.Quantity
			if err := tx.Model(&models.Stock{}).Where("warehouse_id = ? AND product_id = ?", item.FromWarehouseID, item.ProductID).Update("quantity", stock.Quantity).Error; err != nil {
				return err
			}

			movement := models.StockMovement{
				ProductID:       item.ProductID,
				FromWarehouseID: &item.FromWarehouseID,
				UserID:          req.UserID,
				Quantity:        item.Quantity,
				Type:            "Üretim Sarfiyatı",
				OldQuantity:     oldQty,
				NewQuantity:     stock.Quantity,
				Note:            req.Note,
			}
			if err := tx.Create(&movement).Error; err != nil {
				return err
			}
		}

		// 2. Add produced item
		if req.ProducedQuantity <= 0 {
			return errors.New("üretilen miktar sıfırdan büyük olmalıdır")
		}
		var prodStock models.Stock
		var oldProdQty float64 = 0
		if err := tx.Where("warehouse_id = ? AND product_id = ?", req.ToWarehouseID, req.ProducedProductID).First(&prodStock).Error; err != nil {
			prodStock = models.Stock{
				WarehouseID: req.ToWarehouseID,
				ProductID:   req.ProducedProductID,
				Quantity:    req.ProducedQuantity,
			}
			if err := tx.Create(&prodStock).Error; err != nil {
				return err
			}
		} else {
			oldProdQty = prodStock.Quantity
			prodStock.Quantity += req.ProducedQuantity
			if err := tx.Model(&models.Stock{}).Where("warehouse_id = ? AND product_id = ?", req.ToWarehouseID, req.ProducedProductID).Update("quantity", prodStock.Quantity).Error; err != nil {
				return err
			}
		}

		prodMovement := models.StockMovement{
			ProductID:     req.ProducedProductID,
			ToWarehouseID: &req.ToWarehouseID,
			UserID:        req.UserID,
			Quantity:      req.ProducedQuantity,
			Type:          "Üretimden Giriş",
			OldQuantity:   oldProdQty,
			NewQuantity:   prodStock.Quantity,
			Note:          req.Note,
		}
		if err := tx.Create(&prodMovement).Error; err != nil {
			return err
		}

		return nil
	})
}

func PerformSale(req SaleRequest) error {
	var sale models.Sale
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var totalSalePrice float64

		// 1. Create Sale Header
		sale = models.Sale{
			CustomerID: req.CustomerID,
			SaleDate:   req.SaleDate,
			Note:       req.Note,
			UserID:     req.UserID,
			Status:     "Hazırlanıyor",
		}
		if err := tx.Create(&sale).Error; err != nil {
			return err
		}

		// 2. Process each item
		for _, item := range req.Items {
			// Create Sale Item
			saleItem := models.SaleItem{
				SaleID:      sale.ID,
				ProductID:   item.ProductID,
				WarehouseID: item.WarehouseID,
				Quantity:    item.Quantity,
				UnitPrice:   item.UnitPrice,
				TotalPrice:  item.Quantity * item.UnitPrice,
			}
			if err := tx.Create(&saleItem).Error; err != nil {
				return err
			}

			totalSalePrice += saleItem.TotalPrice
		}

		// 3. Update Sale Total
		sale.TotalPrice = totalSalePrice
		if err := tx.Save(&sale).Error; err != nil {
			return err
		}

		return nil
	})

	if err == nil {
		// 4. Trigger Notification (Wait a bit and reload with all relations guaranteed)
		time.Sleep(100 * time.Millisecond) // Give DB a tiny breath to finalize everything
		var fullSale models.Sale
		if err := database.DB.Preload("Customer").Preload("Items.Product").First(&fullSale, sale.ID).Error; err == nil {
			
			customerName := "Bilinmeyen Müşteri"
			if fullSale.Customer.Name != "" {
				customerName = fullSale.Customer.Name
			}

			saleItemsHTML := GetSaleItemsHTML(fullSale)
			
			log.Printf("[NOTIFIER] Triggering SALE notification for ID #%d, Customer: %s, Items: %d", 
				fullSale.ID, customerName, len(fullSale.Items))

			Notifier.Trigger("SALE", "CREATED", "", map[string]interface{}{
				"ID":            fullSale.ID,
				"CUSTOMER_NAME": customerName,
				"TOTAL_PRICE":   fullSale.TotalPrice,
				"SALE_ITEMS":    saleItemsHTML,
				"NOTE":          fullSale.Note,
			})
		} else {
			log.Printf("[NOTIFIER] Error reloading sale #%d for notification: %v", sale.ID, err)
		}
	}

	return err
}

func ShipSale(saleID uint, userID uint) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		var sale models.Sale
		if err := tx.Preload("Items.Product").First(&sale, saleID).Error; err != nil {
			return fmt.Errorf("satış bulunamadı: %v", err)
		}

		if sale.Status != "Hazırlanıyor" {
			return errors.New("bu satış zaten sevk edilmiş veya iptal edilmiş")
		}

		// Process each item for stock deduction
		for _, item := range sale.Items {
			var stock models.Stock
			if err := tx.Preload("Product").Where("warehouse_id = ? AND product_id = ?", item.WarehouseID, item.ProductID).First(&stock).Error; err != nil {
				return fmt.Errorf("%s ürünü depoda bulunamadı", item.Product.Name)
			}

			if stock.Quantity < item.Quantity {
				return fmt.Errorf("yetersiz stok: %s (Mevcut: %v, Gereken: %v)", stock.Product.Name, stock.Quantity, item.Quantity)
			}

			oldQty := stock.Quantity
			stock.Quantity -= item.Quantity
			if err := tx.Model(&models.Stock{}).Where("warehouse_id = ? AND product_id = ?", item.WarehouseID, item.ProductID).Update("quantity", stock.Quantity).Error; err != nil {
				return err
			}

			// Create Stock Movement
			movement := models.StockMovement{
				ProductID:       item.ProductID,
				FromWarehouseID: &item.WarehouseID,
				UserID:          userID,
				Quantity:        item.Quantity,
				Type:            "Satış Sevkiyatı",
				OldQuantity:     oldQty,
				NewQuantity:     stock.Quantity,
				Note:            fmt.Sprintf("Satış No: #%d Sevkiyatı", sale.ID),
				Timestamp:       time.Now(),
				CustomerID:      &sale.CustomerID,
			}
			if err := tx.Create(&movement).Error; err != nil {
				return err
			}
		}

		// Update Sale Status
		now := time.Now()
		sale.Status = "Sevk Edildi"
		sale.ShippedAt = &now
		if err := tx.Save(&sale).Error; err != nil {
			return err
		}

		return nil
	})
}


func CancelSale(saleID uint, userID uint) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		var sale models.Sale
		if err := tx.Preload("Items.Product").First(&sale, saleID).Error; err != nil {
			return fmt.Errorf("satış kaydı bulunamadı: %v", err)
		}

		// 1. If already shipped, reverse stock
		if sale.Status == "Sevk Edildi" {
			for _, item := range sale.Items {
				var stock models.Stock
				err := tx.Where("warehouse_id = ? AND product_id = ?", item.WarehouseID, item.ProductID).First(&stock).Error
				
				oldQty := 0.0
				if err == nil {
					oldQty = stock.Quantity
					stock.Quantity += item.Quantity
					if err := tx.Model(&models.Stock{}).Where("warehouse_id = ? AND product_id = ?", item.WarehouseID, item.ProductID).Update("quantity", stock.Quantity).Error; err != nil {
						return fmt.Errorf("%s ürünü için stok güncellenemedi: %v", item.Product.Name, err)
					}
				} else {
					stock = models.Stock{
						WarehouseID: item.WarehouseID,
						ProductID:   item.ProductID,
						Quantity:    item.Quantity,
					}
					if err := tx.Create(&stock).Error; err != nil {
						return fmt.Errorf("%s ürünü için yeni stok kaydı oluşturulamadı: %v", item.Product.Name, err)
					}
				}

				movement := models.StockMovement{
					ProductID:     item.ProductID,
					ToWarehouseID: &item.WarehouseID,
					UserID:        userID,
					Quantity:      item.Quantity,
					Type:          "Satış İptali",
					OldQuantity:   oldQty,
					NewQuantity:   stock.Quantity,
					Note:          fmt.Sprintf("Sipariş No: #%d İptal Edildi (İade Girişi)", sale.ID),
					Timestamp:     time.Now(),
					CustomerID:    &sale.CustomerID,
				}
				if err := tx.Create(&movement).Error; err != nil {
					return fmt.Errorf("stok hareketi kaydedilemedi: %v", err)
				}
			}
		}

		// 2. Delete Sale Items
		if err := tx.Where("sale_id = ?", sale.ID).Delete(&models.SaleItem{}).Error; err != nil {
			return fmt.Errorf("satış kalemleri silinemedi: %v", err)
		}

		// 3. Delete Sale Header
		if err := tx.Delete(&sale).Error; err != nil {
			return fmt.Errorf("ana satış kaydı silinemedi: %v", err)
		}

		return nil
	})
}

func GetSaleItemsHTML(sale models.Sale) string {
	// Re-fetch items with products if they are missing
	items := sale.Items
	if len(items) == 0 {
		database.DB.Preload("Product").Where("sale_id = ?", sale.ID).Find(&items)
	}

	html := `<div style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
	<table style="width:100%; border-collapse:collapse; font-family: sans-serif; font-size:13px;">
		<thead>
			<tr style="background-color:#f1f5f9;">
				<th style="padding:12px; text-align:left; border-bottom:2px solid #e2e8f0; color:#475569;">Ürün Adı</th>
				<th style="padding:12px; text-align:right; border-bottom:2px solid #e2e8f0; color:#475569;">Miktar</th>
				<th style="padding:12px; text-align:right; border-bottom:2px solid #e2e8f0; color:#475569;">Birim Fiyat</th>
				<th style="padding:12px; text-align:right; border-bottom:2px solid #e2e8f0; color:#475569;">Toplam</th>
			</tr>
		</thead>
		<tbody>`

	if len(items) == 0 {
		html += `<tr><td colspan="4" style="padding:30px; text-align:center; color:#94a3b8; font-style:italic;">Ürün detayları hazırlanamadı.</td></tr>`
	}

	for _, item := range items {
		productName := "Tanımsız Ürün"
		if item.Product.Name != "" {
			productName = item.Product.Name
		}
		
		html += fmt.Sprintf(`
			<tr>
				<td style="padding:12px; border-bottom:1px solid #f1f5f9; color:#1e293b; font-weight:500;">%s</td>
				<td style="padding:12px; text-align:right; border-bottom:1px solid #f1f5f9; color:#475569;">%v %s</td>
				<td style="padding:12px; text-align:right; border-bottom:1px solid #f1f5f9; color:#475569;">%v ₺</td>
				<td style="padding:12px; text-align:right; border-bottom:1px solid #f1f5f9; color:#0f172a; font-weight:700;">%v ₺</td>
			</tr>`,
			productName, item.Quantity, item.Product.Unit,
			item.UnitPrice, item.TotalPrice)
	}

	html += fmt.Sprintf(`
		</tbody>
		<tfoot>
			<tr style="background-color:#f8fafc;">
				<td colspan="3" style="padding:12px; text-align:right; font-weight:700; color:#475569;">GENEL TOPLAM</td>
				<td style="padding:12px; text-align:right; font-weight:900; color:#2563eb; font-size:15px;">%v ₺</td>
			</tr>
		</tfoot>
	</table>
	</div>`, sale.TotalPrice)

	return html
}

func handleEntry(tx *gorm.DB, req StockMovementRequest) error {
	if req.ToWarehouseID == nil {
		return errors.New("to_warehouse_id is required for entry")
	}

	var stock models.Stock
	err := tx.Where("warehouse_id = ? AND product_id = ?", *req.ToWarehouseID, req.ProductID).First(&stock).Error
	
	oldQty := float64(0)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Create new stock record
			stock = models.Stock{
				WarehouseID: *req.ToWarehouseID,
				ProductID:   req.ProductID,
				Quantity:    req.Quantity,
			}
			if err := tx.Create(&stock).Error; err != nil {
				return err
			}
		} else {
			return err
		}
	} else {
		oldQty = stock.Quantity
		stock.Quantity += req.Quantity
		if err := tx.Save(&stock).Error; err != nil {
			return err
		}
	}

	// Create audit log
	movement := models.StockMovement{
		ProductID:     req.ProductID,
		ToWarehouseID: req.ToWarehouseID,
		UserID:        req.UserID,
		Quantity:      req.Quantity,
		Type:          req.Type,
		OldQuantity:   oldQty,
		NewQuantity:   stock.Quantity,
		Note:          req.Note,
	}
	return tx.Create(&movement).Error
}

func handleExit(tx *gorm.DB, req StockMovementRequest) error {
	if req.FromWarehouseID == nil {
		return errors.New("from_warehouse_id is required for exit")
	}

	var stock models.Stock
	if err := tx.Where("warehouse_id = ? AND product_id = ?", *req.FromWarehouseID, req.ProductID).First(&stock).Error; err != nil {
		return errors.New("stock not found in the source warehouse")
	}

	if stock.Quantity < req.Quantity {
		return errors.New("insufficient stock")
	}

	oldQty := stock.Quantity
	stock.Quantity -= req.Quantity

	if err := tx.Save(&stock).Error; err != nil {
		return err
	}

	// Create audit log
	movement := models.StockMovement{
		ProductID:       req.ProductID,
		FromWarehouseID: req.FromWarehouseID,
		UserID:          req.UserID,
		Quantity:        req.Quantity,
		Type:            req.Type,
		OldQuantity:     oldQty,
		NewQuantity:     stock.Quantity,
		Note:            req.Note,
	}
	err := tx.Create(&movement).Error
	if err == nil {
		// Critical Stock Check
		var prod models.Product
		tx.First(&prod, req.ProductID)
		if stock.Quantity <= prod.MinStockLevel {
			Notifier.Trigger("STOCK", "CRITICAL_STOCK", "", map[string]interface{}{
				"PRODUCT":  prod.Name,
				"QUANTITY": stock.Quantity,
				"MIN":      prod.MinStockLevel,
			})
		}
	}
	return err
}

func handleTransfer(tx *gorm.DB, req StockMovementRequest) error {
	if req.FromWarehouseID == nil || req.ToWarehouseID == nil {
		return errors.New("both from_warehouse_id and to_warehouse_id are required for transfer")
	}

	if *req.FromWarehouseID == *req.ToWarehouseID {
		return errors.New("cannot transfer to the same warehouse")
	}

	// 1. Deduct from Source
	var sourceStock models.Stock
	if err := tx.Where("warehouse_id = ? AND product_id = ?", *req.FromWarehouseID, req.ProductID).First(&sourceStock).Error; err != nil {
		return errors.New("stock not found in the source warehouse")
	}

	if sourceStock.Quantity < req.Quantity {
		return errors.New("insufficient stock in source warehouse")
	}

	oldSourceQty := sourceStock.Quantity
	sourceStock.Quantity -= req.Quantity
	if err := tx.Save(&sourceStock).Error; err != nil {
		return err
	}

	// Log Exit from Source
	exitMovement := models.StockMovement{
		ProductID:       req.ProductID,
		FromWarehouseID: req.FromWarehouseID,
		ToWarehouseID:   req.ToWarehouseID,
		UserID:          req.UserID,
		Quantity:        req.Quantity,
		Type:            "Transfer Çıkış",
		OldQuantity:     oldSourceQty,
		NewQuantity:     sourceStock.Quantity,
		Note:            req.Note,
	}
	if err := tx.Create(&exitMovement).Error; err != nil {
		return err
	}

	// 2. Add to Destination
	var destStock models.Stock
	err := tx.Where("warehouse_id = ? AND product_id = ?", *req.ToWarehouseID, req.ProductID).First(&destStock).Error
	
	oldDestQty := float64(0)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			destStock = models.Stock{
				WarehouseID: *req.ToWarehouseID,
				ProductID:   req.ProductID,
				Quantity:    req.Quantity,
			}
			if err := tx.Create(&destStock).Error; err != nil {
				return err
			}
		} else {
			return err
		}
	} else {
		oldDestQty = destStock.Quantity
		destStock.Quantity += req.Quantity
		if err := tx.Save(&destStock).Error; err != nil {
			return err
		}
	}

	// Log Entry to Destination
	entryMovement := models.StockMovement{
		ProductID:       req.ProductID,
		FromWarehouseID: req.FromWarehouseID,
		ToWarehouseID:   req.ToWarehouseID,
		UserID:          req.UserID,
		Quantity:        req.Quantity,
		Type:            "Transfer Giriş",
		OldQuantity:     oldDestQty,
		NewQuantity:     destStock.Quantity,
		Note:            req.Note,
	}
	return tx.Create(&entryMovement).Error
}

func PerformPurchase(req PurchaseRequest) error {
	if len(req.Items) == 0 {
		return errors.New("en az bir ürün eklemelisiniz")
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		var totalPrice float64 = 0
		for _, item := range req.Items {
			totalPrice += item.Quantity * item.UnitPrice
		}

		purchase := models.Purchase{
			PurchaseDate: req.PurchaseDate,
			Note:         req.Note,
			UserID:       req.UserID,
			TotalPrice:   totalPrice,
			Status:       "Hazırlanıyor",
		}
		
		// If a supplier is provided in any item (fallback), use the first one
		for _, item := range req.Items {
			if item.SupplierID != nil && *item.SupplierID != 0 {
				purchase.SupplierID = item.SupplierID
				break
			}
		}

		if err := tx.Create(&purchase).Error; err != nil {
			return err
		}

		for _, item := range req.Items {
			purchaseItem := models.PurchaseItem{
				PurchaseID:  purchase.ID,
				ProductID:   item.ProductID,
				WarehouseID: item.WarehouseID,
				Quantity:    item.Quantity,
				UnitPrice:   item.UnitPrice,
				TotalPrice:  item.Quantity * item.UnitPrice,
			}
			if err := tx.Create(&purchaseItem).Error; err != nil {
				return err
			}
		}
		
		// Notification trigger
		data := map[string]interface{}{
			"ID":    purchase.ID,
			"TOTAL": totalPrice,
		}
		if purchase.SupplierID != nil {
			var supplier models.Supplier
			tx.First(&supplier, *purchase.SupplierID)
			data["SUPPLIER"] = supplier.Name
		} else {
			data["SUPPLIER"] = "Henüz Seçilmedi"
		}

		// Preload for HTML table
		var fullPurchase models.Purchase
		tx.Preload("Items.Product").First(&fullPurchase, purchase.ID)
		purchaseItemsHTML := GetPurchaseItemsHTML(fullPurchase)
		data["PURCHASE_ITEMS"] = purchaseItemsHTML
		data["NOTE"] = purchase.Note

		Notifier.Trigger("PURCHASE", "CREATED", "", data)

		return nil
	})
}

func CompletePurchase(purchaseID uint, userID uint, receipts []PurchaseReceiptItem) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		var purchase models.Purchase
		if err := tx.Preload("Items.Product").First(&purchase, purchaseID).Error; err != nil {
			return err
		}

		if purchase.Status != "Sipariş Verildi" {
			return errors.New("bu sipariş henüz resmiyete dökülmemiş veya zaten tamamlanmış/iptal edilmiş")
		}

		// Create a map for easy lookup of received quantities
		receiptMap := make(map[uint]float64)
		for _, r := range receipts {
			receiptMap[r.ItemID] = r.Received
		}

		allReceived := true
		for i, item := range purchase.Items {
			receivedQty, exists := receiptMap[item.ID]
			if !exists || receivedQty <= 0 {
				// If not fully received yet, check if it was already partially received
				if item.ReceivedQty < item.Quantity {
					allReceived = false
				}
				continue
			}

			if item.ReceivedQty+receivedQty > item.Quantity {
				return fmt.Errorf("%s için toplam gelen miktar (%v) sipariş miktarını (%v) aşamaz", item.Product.Name, item.ReceivedQty+receivedQty, item.Quantity)
			}

			// 1. Update Stock
			var stock models.Stock
			err := tx.Where("warehouse_id = ? AND product_id = ?", item.WarehouseID, item.ProductID).First(&stock).Error
			
			oldQty := 0.0
			if err == nil {
				oldQty = stock.Quantity
				stock.Quantity += receivedQty
				if err := tx.Model(&models.Stock{}).Where("warehouse_id = ? AND product_id = ?", item.WarehouseID, item.ProductID).Update("quantity", stock.Quantity).Error; err != nil {
					return err
				}
			} else {
				stock = models.Stock{
					WarehouseID: item.WarehouseID,
					ProductID:   item.ProductID,
					Quantity:    receivedQty,
				}
				if err := tx.Create(&stock).Error; err != nil {
					return err
				}
			}

			// 2. Create Stock Movement
			movement := models.StockMovement{
				ProductID:     item.ProductID,
				ToWarehouseID: &item.WarehouseID,
				UserID:        userID,
				SupplierID:    item.SupplierID,
				Quantity:      receivedQty,
				Type:          "Satınalma Girişi",
				OldQuantity:   oldQty,
				NewQuantity:   stock.Quantity,
				Note:          fmt.Sprintf("Sipariş No: #%d (Kısmi Mal Kabul)", purchase.ID),
				Timestamp:     time.Now(),
			}
			if err := tx.Create(&movement).Error; err != nil {
				return err
			}

			// 3. Update PurchaseItem ReceivedQty
			purchase.Items[i].ReceivedQty += receivedQty
			if err := tx.Model(&models.PurchaseItem{}).Where("id = ?", item.ID).Update("received_qty", purchase.Items[i].ReceivedQty).Error; err != nil {
				return err
			}

			if purchase.Items[i].ReceivedQty < item.Quantity {
				allReceived = false
			}
		}

		// Update Purchase Status if all items are fully received
		if allReceived {
			if err := tx.Model(&purchase).Update("status", "Depoya Alındı").Error; err != nil {
				return err
			}
			
			var supplier models.Supplier
			if purchase.SupplierID != nil {
				tx.First(&supplier, *purchase.SupplierID)
			}
			
			purchaseItemsHTML := GetPurchaseItemsHTML(purchase)
			Notifier.Trigger("PURCHASE", "STATUS_CHANGED", "Depoya Alındı", map[string]interface{}{
				"ID":             purchase.ID,
				"STATUS":         "Depoya Alındı",
				"TOTAL":          purchase.TotalPrice,
				"NOTE":           purchase.Note,
				"PLANLAMA_NOTU":  purchase.Note,
				"PURCHASE_ITEMS": purchaseItemsHTML,
			})
		}

		return nil
	})
}

func CreateWorkOrder(wo models.WorkOrder) error {
	// Depo seçim kontrolü
	if wo.SourceWarehouseID == 0 || wo.TargetWarehouseID == 0 {
		return errors.New("kaynak ve hedef depo seçimi zorunludur")
	}

	// Reçete (BOM) kontrolü - Planlama aşamasında reçete şart
	var count int64
	database.DB.Model(&models.Recipe{}).Where("product_id = ?", wo.ProductID).Count(&count)
	if count == 0 {
		return errors.New("seçilen ürünün reçetesi (BOM) tanımlanmamış. Önce reçete oluşturmalısınız.")
	}
	err := database.DB.Create(&wo).Error
	if err == nil {
		var prod models.Product
		database.DB.First(&prod, wo.ProductID)
		// Preload warehouses for the HTML table
		database.DB.Preload("SourceWarehouse").Preload("TargetWarehouse").First(&wo, wo.ID)
		rawMaterialsHTML := getWorkOrderRawMaterialsHTML(wo)
		Notifier.Trigger("WORK_ORDER", "CREATED", "", map[string]interface{}{
			"ID":            wo.ID,
			"PRODUCT":       prod.Name,
			"QUANTITY":      wo.Quantity,
			"STATUS":        wo.Status,
			"NOTE":          wo.Note,
			"PLANLAMA_NOTU": wo.Note,
			"RAW_MATERIALS": rawMaterialsHTML,
		})
	}
	return err
}

func ProcessWorkOrder(woID uint, newStatus string) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		var wo models.WorkOrder
		if err := tx.Preload("Product").Preload("SourceWarehouse").Preload("TargetWarehouse").First(&wo, woID).Error; err != nil {
			return err
		}

		// Validation
		if wo.Status == "Tamamlandı" || wo.Status == "İptal" {
			return errors.New("bu iş emri zaten kapalı")
		}

		// If starting, set StartedAt
		if newStatus == "Üretimde" {
			now := time.Now()
			wo.StartedAt = &now
		}

		// If completing, perform stock actions
		if newStatus == "Tamamlandı" {
			// 1. Get Recipe (BOM)
			var recipe models.Recipe
			if err := tx.Preload("Items.Product").Where("product_id = ?", wo.ProductID).First(&recipe).Error; err != nil {
				return errors.New("ürün reçetesi (BOM) bulunamadı")
			}

			// 2. Consume Raw Materials from SOURCE WAREHOUSE
			for _, item := range recipe.Items {
				neededQty := item.Quantity * wo.Quantity
				
				var stock models.Stock
				if err := tx.Where("warehouse_id = ? AND product_id = ?", wo.SourceWarehouseID, item.ProductID).First(&stock).Error; err != nil {
					return errors.New(item.Product.Name + " için kaynak depoda stok kaydı bulunamadı")
				}
				
				if stock.Quantity < neededQty {
					return errors.New(item.Product.Name + " yetersiz stok! Gereken: " + fmt.Sprintf("%.2f", neededQty))
				}

				oldQty := stock.Quantity
				stock.Quantity -= neededQty
				if err := tx.Model(&models.Stock{}).Where("warehouse_id = ? AND product_id = ?", wo.SourceWarehouseID, item.ProductID).Update("quantity", stock.Quantity).Error; err != nil {
					return err
				}

				// Log Movement (Çıkış)
				tx.Create(&models.StockMovement{
					ProductID:       item.ProductID,
					FromWarehouseID: &wo.SourceWarehouseID,
					Quantity:        neededQty,
					Type:            "Üretim Sarfiyatı",
					OldQuantity:     oldQty,
					NewQuantity:     stock.Quantity,
					Note:            fmt.Sprintf("İş Emri #%d Sarfiyatı", wo.ID),
					UserID:          1,
					Timestamp:       time.Now(),
				})
			}

			// 3. Produce Finished Good into TARGET WAREHOUSE
			var fgStock models.Stock
			err := tx.Where("warehouse_id = ? AND product_id = ?", wo.TargetWarehouseID, wo.ProductID).First(&fgStock).Error
			oldQty := 0.0
			if err == nil {
				oldQty = fgStock.Quantity
				fgStock.Quantity += wo.Quantity
				tx.Model(&models.Stock{}).Where("warehouse_id = ? AND product_id = ?", wo.TargetWarehouseID, wo.ProductID).Update("quantity", fgStock.Quantity)
			} else {
				fgStock = models.Stock{WarehouseID: wo.TargetWarehouseID, ProductID: wo.ProductID, Quantity: wo.Quantity}
				tx.Create(&fgStock)
			}

			// Log Production Movement (Giriş)
			tx.Create(&models.StockMovement{
				ProductID:     wo.ProductID,
				ToWarehouseID: &wo.TargetWarehouseID,
				Quantity:      wo.Quantity,
				Type:          "Üretimden Giriş",
				OldQuantity:   oldQty,
				NewQuantity:   fgStock.Quantity,
				Note:          fmt.Sprintf("İş Emri #%d Üretimi", wo.ID),
				UserID:        1,
				Timestamp:     time.Now(),
			})

			now := time.Now()
			wo.EndDate = &now
		}

		wo.Status = newStatus
		err := tx.Save(&wo).Error
		if err == nil {
			log.Printf("[ProcessWorkOrder] Triggering notification for WO #%d - New Status: %s", wo.ID, newStatus)
			rawMaterialsHTML := getWorkOrderRawMaterialsHTML(wo)
			Notifier.Trigger("WORK_ORDER", "STATUS_CHANGED", newStatus, map[string]interface{}{
				"ID":            wo.ID,
				"PRODUCT":       wo.Product.Name,
				"STATUS":        newStatus,
				"NOTE":          wo.Note,
				"PLANLAMA_NOTU": wo.Note,
				"RAW_MATERIALS": rawMaterialsHTML,
			})
		}
		return err
	})
}

func DeleteWorkOrder(id uint) error {
	var wo models.WorkOrder
	if err := database.DB.First(&wo, id).Error; err != nil {
		return err
	}
	// Sadece Planlandı veya İptal durumundakiler silinebilir
	if wo.Status != "İptal" && wo.Status != "Planlandı" {
		return errors.New("sadece Planlandı veya İptal durumundaki iş emirleri silinebilir")
	}
	return database.DB.Delete(&wo).Error
}

func ConvertQuoteToSale(quoteID uint, warehouseID uint, userID uint) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		var quote models.Quote
		if err := tx.Preload("Items.Product").First(&quote, quoteID).Error; err != nil {
			return err
		}

		if quote.Status == "Satışa Döndü" {
			return errors.New("bu teklif zaten satışa dönüştürülmüş")
		}

		// 1. Create the Sale in "Hazırlanıyor" status
		sale := models.Sale{
			CustomerID: quote.CustomerID,
			SaleDate:   time.Now(),
			Note:       fmt.Sprintf("Teklif #%s üzerinden oluşturuldu. %s", quote.QuoteNumber, quote.Note),
			TotalPrice: quote.TotalPrice,
			UserID:     userID,
			Status:     "Hazırlanıyor",
		}
		if err := tx.Create(&sale).Error; err != nil {
			return err
		}

		// 2. Create Sale Items (Warehouse is selected during conversion)
		for _, qItem := range quote.Items {
			saleItem := models.SaleItem{
				SaleID:      sale.ID,
				ProductID:   qItem.ProductID,
				WarehouseID: warehouseID,
				Quantity:    qItem.Quantity,
				UnitPrice:   qItem.UnitPrice,
				TotalPrice:  qItem.TotalPrice,
			}
			if err := tx.Create(&saleItem).Error; err != nil {
				return err
			}
		}

		// 3. Update Quote Status
		return tx.Model(&quote).Update("status", "Satışa Döndü").Error
	})
}

func getWorkOrderRawMaterialsHTML(wo models.WorkOrder) string {
	var recipe models.Recipe
	// Explicitly preload Items and Items.Product
	err := database.DB.Preload("Items").Preload("Items.Product").Where("product_id = ?", wo.ProductID).First(&recipe).Error
	if err != nil {
		log.Printf("[getWorkOrderRawMaterialsHTML] Recipe NOT FOUND for ProductID %d: %v", wo.ProductID, err)
		return "<i>Reçete bilgisi bulunamadı.</i>"
	}

	log.Printf("[getWorkOrderRawMaterialsHTML] Found Recipe #%d with %d items for ProductID %d", recipe.ID, len(recipe.Items), wo.ProductID)

	if len(recipe.Items) == 0 {
		return "<i>Bu ürünün reçetesinde hammadde tanımlanmamış.</i>"
	}

	html := "<div style='margin-bottom: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd;'>"
	html += "<h4 style='margin-top: 0; color: #0369a1; border-bottom: 1px solid #bae6fd; padding-bottom: 5px;'>Üretim Akış Detayı</h4>"
	html += fmt.Sprintf("<p style='margin: 5px 0; font-size: 13px;'><b>Güncel Durum:</b> %s</p>", wo.Status)
	html += fmt.Sprintf("<p style='margin: 5px 0; font-size: 13px;'><b>Kaynak Depo:</b> %s</p>", wo.SourceWarehouse.Name)
	html += fmt.Sprintf("<p style='margin: 5px 0; font-size: 13px;'><b>Hedef Depo:</b> %s</p>", wo.TargetWarehouse.Name)
	if wo.StartedAt != nil {
		html += fmt.Sprintf("<p style='margin: 5px 0; font-size: 13px;'><b>Başlangıç:</b> %s</p>", wo.StartedAt.Format("02.01.2006 15:04"))
	}
	html += "</div>"

	html += "<h4 style='color: #1e293b; margin-bottom: 10px;'>Hammadde İhtiyaç Analizi</h4>"
	html += "<table style='width:100%; border-collapse: collapse; font-size: 13px; border: 1px solid #e2e8f0;'>"
	html += "<thead style='background-color: #f8fafc;'>"
	html += "<tr>"
	html += "<th style='padding: 10px; border: 1px solid #e2e8f0; text-align: left;'>Hammadde / Ürün</th>"
	html += "<th style='padding: 10px; border: 1px solid #e2e8f0; text-align: center;'>Birim İht.</th>"
	html += "<th style='padding: 10px; border: 1px solid #e2e8f0; text-align: center;'>Top. İhtiyaç</th>"
	html += "<th style='padding: 10px; border: 1px solid #e2e8f0; text-align: right;'>Stok / Durum</th>"
	html += "</tr>"
	html += "</thead>"
	html += "<tbody>"

	for _, item := range recipe.Items {
		var stock models.Stock
		database.DB.Where("warehouse_id = ? AND product_id = ?", wo.SourceWarehouseID, item.ProductID).First(&stock)
		
		totalNeeded := item.Quantity * wo.Quantity
		statusColor := "#16a34a" // green
		statusText := "Yeterli"
		if stock.Quantity < totalNeeded {
			statusColor = "#dc2626" // red
			statusText = "Eksik"
		}

		pName := item.Product.Name
		if pName == "" {
			pName = fmt.Sprintf("Ürün #%d", item.ProductID)
		}

		html += "<tr>"
		html += fmt.Sprintf("<td style='padding: 10px; border: 1px solid #e2e8f0;'>%s</td>", pName)
		html += fmt.Sprintf("<td style='padding: 10px; border: 1px solid #e2e8f0; text-align: center;'>%.2f</td>", item.Quantity)
		html += fmt.Sprintf("<td style='padding: 10px; border: 1px solid #e2e8f0; text-align: center;'>%.2f</td>", totalNeeded)
		html += fmt.Sprintf("<td style='padding: 10px; border: 1px solid #e2e8f0; text-align: right; color: %s; font-weight: bold;'>%.2f (%s)</td>", statusColor, stock.Quantity, statusText)
		html += "</tr>"
	}
	html += "</tbody>"
	html += "</table>"
	return html
}

func GetPurchaseItemsHTML(purchase models.Purchase) string {
	if len(purchase.Items) == 0 {
		// Try one last time to preload if they are missing
		database.DB.Preload("Items.Product").First(&purchase, purchase.ID)
	}

	if len(purchase.Items) == 0 {
		log.Printf("[Notifier] GetPurchaseItemsHTML: No items found for Purchase #%d", purchase.ID)
		return "<i>Sipariş içeriği (ürünler) bulunamadı. Lütfen veritabanını kontrol edin.</i>"
	}

	html := "<h4 style='color: #1e293b; margin-bottom: 10px; border-bottom: 2px solid #ea580c; padding-bottom: 5px;'>Sipariş Verilen Ürünler</h4>"
	html += "<table style='width:100%; border-collapse: collapse; font-size: 13px; border: 1px solid #e2e8f0;'>"
	html += "<thead style='background-color: #fff7ed;'>"
	html += "<tr>"
	html += "<th style='padding: 10px; border: 1px solid #e2e8f0; text-align: left;'>Ürün</th>"
	html += "<th style='padding: 10px; border: 1px solid #e2e8f0; text-align: center;'>Miktar</th>"
	html += "<th style='padding: 10px; border: 1px solid #e2e8f0; text-align: right;'>Birim Fiyat</th>"
	html += "<th style='padding: 10px; border: 1px solid #e2e8f0; text-align: right;'>Toplam</th>"
	html += "</tr>"
	html += "</thead>"
	html += "<tbody>"

	for _, item := range purchase.Items {
		pName := item.Product.Name
		pBarcode := item.Product.Barcode
		if pName == "" || pBarcode == "" {
			var prod models.Product
			database.DB.First(&prod, item.ProductID)
			pName = prod.Name
			pBarcode = prod.Barcode
		}

		html += "<tr>"
		html += fmt.Sprintf("<td style='padding: 10px; border: 1px solid #e2e8f0;'>%s <br><small style='color:#666'>%s</small></td>", pName, pBarcode)
		html += fmt.Sprintf("<td style='padding: 10px; border: 1px solid #e2e8f0; text-align: center;'>%.2f</td>", item.Quantity)
		html += fmt.Sprintf("<td style='padding: 10px; border: 1px solid #e2e8f0; text-align: right;'>%.2f ₺</td>", item.UnitPrice)
		html += fmt.Sprintf("<td style='padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;'>%.2f ₺</td>", item.TotalPrice)
		html += "</tr>"
	}

	html += "<tr style='background-color: #f8fafc; font-weight: bold;'>"
	html += "<td colspan='3' style='padding: 10px; border: 1px solid #e2e8f0; text-align: right;'>Genel Toplam:</td>"
	html += fmt.Sprintf("<td style='padding: 10px; border: 1px solid #e2e8f0; text-align: right; color: #ea580c;'>%.2f ₺</td>", purchase.TotalPrice)
	html += "</tr>"

	html += "</tbody>"
	html += "</table>"
	return html
}
