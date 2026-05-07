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

	var purchase models.Purchase
	if err := db.First(&purchase, 45).Error; err != nil {
		log.Fatalf("Purchase 45 not found: %v", err)
	}

	log.Printf("Current Status of #45: %s", purchase.Status)

	if purchase.Status == "Depoya Alındı" {
		log.Println("Resetting status to 'Sipariş Verildi' so it can be re-received...")
		if err := db.Model(&purchase).Update("status", "Sipariş Verildi").Error; err != nil {
			log.Fatal(err)
		}
		log.Println("Status reset successfully.")
	} else {
		log.Println("Purchase 45 is not in 'Depoya Alındı' status. No reset needed or check manually.")
	}
}
