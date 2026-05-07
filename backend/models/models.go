package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Username  string    `gorm:"not null;unique" json:"username"`
	Email     string    `gorm:"not null;unique" json:"email"`
	Password  string    `gorm:"not null" json:"-"`
	IsAdmin   bool      `gorm:"default:false" json:"is_admin"`
	Status      string       `gorm:"default:'Active'" json:"status"` // Active, Passive
	Permissions []Permission `gorm:"foreignKey:UserID" json:"permissions"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

type Permission struct {
	ID         uint   `gorm:"primaryKey" json:"id"`
	UserID     uint   `gorm:"index" json:"user_id"`
	ModuleName string `gorm:"type:varchar(100)" json:"module_name"`
	CanAccess  bool   `gorm:"default:false" json:"can_access"`
}

type ResetToken struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `json:"user_id"`
	Token     string    `gorm:"uniqueIndex" json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
}

type Warehouse struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"uniqueIndex;not null" json:"name"` // e.g., Depo-Stok, Üretim
	Description string         `json:"description"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type Product struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	Name          string         `gorm:"not null" json:"name"`
	Barcode       string         `gorm:"uniqueIndex;not null" json:"barcode"`
	Unit          string         `gorm:"not null" json:"unit"` // Adet, Metre, KG
	Category      string         `json:"category"`      // Cins (Kazan, Bıçak vb.)
	SupplierName  string         `json:"supplier_name"`
	MinStockLevel float64        `gorm:"default:0" json:"min_stock_level"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

// Stocks: Hangi depoda hangi üründen ne kadar var?
type Stock struct {
	WarehouseID uint      `gorm:"primaryKey" json:"warehouse_id"`
	ProductID   uint      `gorm:"primaryKey" json:"product_id"`
	Quantity    float64   `gorm:"not null;default:0" json:"quantity"`
	Warehouse   Warehouse `gorm:"foreignKey:WarehouseID" json:"warehouse"`
	Product     Product   `gorm:"foreignKey:ProductID" json:"product"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// StockMovements: İzlenebilirlik için audit log
type StockMovement struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	ProductID       uint           `gorm:"index;not null" json:"product_id"`
	Product         Product        `gorm:"foreignKey:ProductID" json:"product"`
	FromWarehouseID *uint          `gorm:"index" json:"from_warehouse_id"`
	FromWarehouse   *Warehouse     `gorm:"foreignKey:FromWarehouseID" json:"from_warehouse"`
	ToWarehouseID   *uint          `gorm:"index" json:"to_warehouse_id"`
	ToWarehouse     *Warehouse     `gorm:"foreignKey:ToWarehouseID" json:"to_warehouse"`
	UserID          uint           `gorm:"index;not null" json:"user_id"`
	User            User           `gorm:"foreignKey:UserID" json:"user"`
	CustomerID      *uint          `gorm:"index" json:"customer_id"`
	Customer        *Customer      `gorm:"foreignKey:CustomerID" json:"customer"`
	SupplierID      *uint          `gorm:"index" json:"supplier_id"`
	Supplier        *Supplier      `gorm:"foreignKey:SupplierID" json:"supplier"`
	Quantity        float64        `gorm:"not null" json:"quantity"`
	Type            string         `gorm:"not null" json:"type"` // Giriş, Çıkış, Transfer, Düzeltme, Satış, Satınalma
	OldQuantity     float64        `gorm:"not null" json:"old_quantity"`
	NewQuantity     float64        `gorm:"not null" json:"new_quantity"`
	Note            string         `json:"note"`
	Timestamp       time.Time      `gorm:"autoCreateTime" json:"timestamp"`
}

// ... (other models)

type Supplier struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	Name             string    `gorm:"not null;unique" json:"name"`
	AuthorizedPerson string    `json:"authorized_person"`
	Email            string    `json:"email"`
	Phone            string    `json:"phone"`
	Address          string    `json:"address"`
	Note             string    `json:"note"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type Purchase struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	SupplierID   *uint          `gorm:"index" json:"supplier_id"`
	Supplier     *Supplier      `gorm:"foreignKey:SupplierID" json:"supplier"`
	PurchaseDate time.Time      `gorm:"not null" json:"purchase_date"`
	Note         string         `json:"note"`
	TotalPrice   float64        `json:"total_price"`
	Status       string         `gorm:"default:'Bekliyor'" json:"status"` // Bekliyor, Tamamlandı, İptal
	UserID       uint           `gorm:"index" json:"user_id"`
	Items        []PurchaseItem `gorm:"foreignKey:PurchaseID" json:"items"`
	CreatedAt    time.Time      `json:"created_at"`
}

type PurchaseItem struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	PurchaseID  uint      `gorm:"index" json:"purchase_id"`
	ProductID   uint      `gorm:"index" json:"product_id"`
	Product     Product   `gorm:"foreignKey:ProductID" json:"product"`
	WarehouseID uint      `gorm:"index" json:"warehouse_id"`
	Warehouse   Warehouse `gorm:"foreignKey:WarehouseID" json:"warehouse"`
	SupplierID  *uint     `gorm:"index" json:"supplier_id"`
	Supplier    *Supplier `gorm:"foreignKey:SupplierID" json:"supplier"`
	Quantity    float64   `gorm:"not null" json:"quantity"`
	UnitPrice   float64   `gorm:"not null" json:"unit_price"`
	TotalPrice  float64   `gorm:"not null" json:"total_price"`
	ReceivedQty float64   `gorm:"default:0" json:"received_qty"`
}

type WorkOrder struct {
	ID              uint       `gorm:"primaryKey" json:"id"`
	ProductID       uint       `gorm:"index" json:"product_id"`
	Product         Product    `gorm:"foreignKey:ProductID" json:"product"`
	Quantity        float64    `json:"quantity"`
	Status            string     `gorm:"default:'Planlandı'" json:"status"` // Planlandı, Üretimde, Tamamlandı, İptal
	SourceWarehouseID uint       `gorm:"index" json:"source_warehouse_id"` // Hammaddelerin düşeceği depo
	SourceWarehouse   Warehouse  `gorm:"foreignKey:SourceWarehouseID" json:"source_warehouse"`
	TargetWarehouseID uint       `gorm:"index" json:"target_warehouse_id"` // Üretilen ürünün gireceği depo
	TargetWarehouse   Warehouse  `gorm:"foreignKey:TargetWarehouseID" json:"target_warehouse"`
	StartDate         time.Time  `json:"start_date"`
	StartedAt       *time.Time `json:"started_at"` // Üretime giriş saati
	EndDate         *time.Time `json:"end_date"`
	Note            string     `json:"note"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// UnitConversions: Birim dönüşüm katsayıları
type UnitConversion struct {
	ID         uint    `gorm:"primaryKey" json:"id"`
	FromUnit   string  `gorm:"index;not null" json:"from_unit"`
	ToUnit     string  `gorm:"index;not null" json:"to_unit"`
	Multiplier float64 `gorm:"not null" json:"multiplier"` // Örn: From: Metre, To: CM, Multiplier: 100
}

type Setting struct {
	Key   string `gorm:"primaryKey" json:"key"`
	Value string `gorm:"type:text" json:"value"`
}

type Recipe struct {
	ID        uint         `gorm:"primaryKey" json:"id"`
	ProductID uint         `gorm:"uniqueIndex" json:"product_id"`
	Product   Product      `gorm:"foreignKey:ProductID" json:"product"`
	Items     []RecipeItem `gorm:"foreignKey:RecipeID;constraint:OnDelete:CASCADE;" json:"items"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
}

type RecipeItem struct {
	ID        uint    `gorm:"primaryKey" json:"id"`
	RecipeID  uint    `gorm:"index" json:"recipe_id"`
	ProductID uint    `json:"product_id"`
	Product   Product `gorm:"foreignKey:ProductID" json:"product"`
	Quantity  float64 `json:"quantity"`
}

type Customer struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	Name             string    `gorm:"not null;unique" json:"name"`
	AuthorizedPerson string    `json:"authorized_person"`
	ContactPerson    string    `json:"contact_person"`
	Email            string    `json:"email"`
	Phone            string    `json:"phone"`
	Address          string    `json:"address"`
	Note             string    `json:"note"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type Sale struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	CustomerID  uint       `gorm:"index" json:"customer_id"`
	Customer    Customer   `gorm:"foreignKey:CustomerID" json:"customer"`
	SaleDate    time.Time  `gorm:"not null" json:"sale_date"`
	Note        string     `json:"note"`
	TotalPrice  float64    `gorm:"not null" json:"total_price"`
	UserID      uint       `gorm:"index" json:"user_id"`
	Items       []SaleItem `gorm:"foreignKey:SaleID" json:"items"`
	CreatedAt   time.Time  `json:"created_at"`
}

type SaleItem struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	SaleID      uint      `gorm:"index" json:"sale_id"`
	ProductID   uint      `gorm:"index" json:"product_id"`
	Product     Product   `gorm:"foreignKey:ProductID" json:"product"`
	WarehouseID uint      `gorm:"index" json:"warehouse_id"`
	Warehouse   Warehouse `gorm:"foreignKey:WarehouseID" json:"warehouse"`
	Quantity    float64   `gorm:"not null" json:"quantity"`
	UnitPrice   float64   `gorm:"not null" json:"unit_price"`
	TotalPrice  float64   `gorm:"not null" json:"total_price"`
}

type Quote struct {
	ID         uint        `gorm:"primaryKey" json:"id"`
	CustomerID uint        `gorm:"index" json:"customer_id"`
	Customer   Customer    `gorm:"foreignKey:CustomerID" json:"customer"`
	QuoteDate  time.Time   `json:"quote_date"`
	ValidUntil time.Time   `json:"valid_until"` // Geçerlilik tarihi
	TotalPrice float64     `json:"total_price"`
	Status     string      `gorm:"default:'Beklemede'" json:"status"` // Beklemede, Gönderildi, Onaylandı, Reddedildi, Satışa Döndü
	Note       string      `json:"note"`
	Items      []QuoteItem `gorm:"foreignKey:QuoteID;constraint:OnDelete:CASCADE;" json:"items"`
	CreatedAt  time.Time   `json:"created_at"`
	UpdatedAt  time.Time   `json:"updated_at"`
}

type QuoteItem struct {
	ID         uint    `gorm:"primaryKey" json:"id"`
	QuoteID    uint    `gorm:"index" json:"quote_id"`
	ProductID  uint    `json:"product_id"`
	Product    Product `gorm:"foreignKey:ProductID" json:"product"`
	Quantity   float64 `json:"quantity"`
	UnitPrice  float64 `json:"unit_price"`
	TotalPrice float64 `json:"total_price"`
}

type NotificationRule struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	FlowName       string    `gorm:"not null" json:"flow_name"`   // PURCHASE, WORK_ORDER, QUOTE, STOCK, USER
	TriggerEvent   string    `gorm:"not null" json:"trigger_event"` // CREATED, STATUS_CHANGED, CRITICAL_STOCK
	TargetStatus   string    `json:"target_status"`                 // E.g., "Tamamlandı", "İptal"
	RecipientEmails  string    `gorm:"type:text" json:"recipient_emails"` // Comma separated (system users)
	ManualRecipients string    `gorm:"type:text" json:"manual_recipients"` // Comma separated (external)
	SubjectTemplate  string    `json:"subject_template"`
	BodyTemplate     string    `gorm:"type:text" json:"body_template"`
	IsActive         bool      `gorm:"default:true" json:"is_active"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

