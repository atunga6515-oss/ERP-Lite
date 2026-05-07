package database

import (
	"log"
	"os"

	"erp-lite-backend/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"golang.org/x/crypto/bcrypt"
)

var DB *gorm.DB

func Connect() {
	// In a real app, use environment variables
	dsn := "host=localhost user=alpertunga dbname=erp_lite port=5432 sslmode=disable"
	
	// You might want to use godotenv to load from .env here if needed
	if os.Getenv("DATABASE_URL") != "" {
		dsn = os.Getenv("DATABASE_URL")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database. \n", err)
	}

	log.Println("Connected Successfully to Database")
	DB = db

	// Run Migrations
	log.Println("Running Migrations")
	err = db.AutoMigrate(
		&models.User{},
		&models.Warehouse{},
		&models.Product{},
		&models.Stock{},
		&models.StockMovement{},
		&models.UnitConversion{},
		&models.Setting{},
		&models.Recipe{},
		&models.RecipeItem{},
		&models.Customer{},
		&models.Supplier{},
		&models.Sale{},
		&models.SaleItem{},
		&models.Purchase{},
		&models.PurchaseItem{},
		&models.WorkOrder{},
		&models.Quote{},
		&models.QuoteItem{},
		&models.Permission{},
		&models.ResetToken{},
		&models.NotificationRule{},
	)
	if err != nil {
		log.Fatal("Failed to run migrations. \n", err)
	}

	// Seed Admin User
	var userCount int64
	DB.Model(&models.User{}).Count(&userCount)
	if userCount == 0 {
		hashedPass, _ := bcrypt.GenerateFromPassword([]byte("admin123"), 10)
		admin := models.User{
			Username: "admin",
			Email:    "admin@example.com",
			Password: string(hashedPass),
			IsAdmin:  true,
			Status:   "Active",
		}
		DB.Create(&admin)

		// Admin zaten is_admin: true olduğu için tüm yetkilere sahip ama örnek olsun diye ekleyelim
		modules := []string{"tanimlar", "stok", "satinalma", "teklif", "satis", "uretim", "raporlar"}
		for _, m := range modules {
			DB.Create(&models.Permission{
				UserID:     admin.ID,
				ModuleName: m,
				CanAccess:  true,
			})
		}
	}

	// Seed Session Timeout Setting
	var timeoutCount int64
	DB.Model(&models.Setting{}).Where("key = ?", "session_timeout").Count(&timeoutCount)
	if timeoutCount == 0 {
		DB.Create(&models.Setting{Key: "session_timeout", Value: "5"}) // Varsayılan 5 dk
	}

	log.Println("Migrations and Seeding completed.")
}
