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

	var users []models.User
	db.Find(&users)

	for _, u := range users {
		log.Printf("User: %s, ID: %d", u.Username, u.ID)
	}
}
