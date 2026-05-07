package main

import (
	"log"
	"erp-lite-backend/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	dsn := "host=localhost user=alpertunga dbname=erp_lite port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	// First delete purchase items to maintain referential integrity (though GORM handles it if configured, manual is safer for scratch scripts)
	if err := db.Where("purchase_id = ?", 45).Delete(&models.PurchaseItem{}).Error; err != nil {
		log.Fatalf("Failed to delete purchase items: %v", err)
	}

	if err := db.Delete(&models.Purchase{}, 45).Error; err != nil {
		log.Fatalf("Failed to delete purchase 45: %v", err)
	}

	log.Println("Purchase 45 and its items have been permanently deleted.")
}
