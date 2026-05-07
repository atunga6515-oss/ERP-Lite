package main

import (
	"erp-lite-backend/database"
	"erp-lite-backend/services"
	"log"
)

func main() {
	database.Connect()
	log.Println("Manual Notification Test Started...")
	
	// Test Trigger for WORK_ORDER CREATED
	services.Notifier.Trigger("WORK_ORDER", "CREATED", "", map[string]interface{}{
		"ID": 999,
		"PRODUCT": "TEST PRODUCT",
		"QUANTITY": 10.5,
	})
	
	log.Println("Manual Notification Test Finished. Check logs.")
}
