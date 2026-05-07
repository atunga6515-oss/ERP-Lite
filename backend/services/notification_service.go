package services

import (
	"erp-lite-backend/database"
	"erp-lite-backend/models"
	"fmt"
	"log"
	"strings"
)

type NotificationService struct{}

var Notifier = &NotificationService{}

// Trigger checks for matching rules and sends notifications
func (ns *NotificationService) Trigger(flow string, event string, targetStatus string, data map[string]interface{}) {
	var activeRules []models.NotificationRule
	database.DB.Where("is_active = ?", true).Find(&activeRules)
	
	log.Printf("[Notifier] Trigger Started - Flow: %s, Event: %s, Status: %s. Total Active Rules: %d", flow, event, targetStatus, len(activeRules))

	for _, rule := range activeRules {
		// 1. Flow Name Match (Case-Insensitive)
		if !strings.EqualFold(rule.FlowName, flow) { continue }
		
		// 2. Event Match (Case-Insensitive)
		if !strings.EqualFold(rule.TriggerEvent, event) { continue }

		log.Printf("[Notifier] Evaluating Rule #%d for %s:%s", rule.ID, flow, event)
		
		isMatch := true
		if event == "STATUS_CHANGED" {
			if rule.TargetStatus != "" {
				isMatch = false
				allowed := strings.Split(rule.TargetStatus, ",")
				for _, s := range allowed {
					if strings.EqualFold(strings.TrimSpace(s), strings.TrimSpace(targetStatus)) {
						isMatch = true
						break
					}
				}
			}
		}

		if isMatch {
			log.Printf("[Notifier] Rule #%d: MATCH FOUND. Processing...", rule.ID)
			ns.processRule(rule, data)
		}
	}
}

func (ns *NotificationService) processRule(rule models.NotificationRule, data map[string]interface{}) {
	if rule.RecipientEmails == "" && rule.ManualRecipients == "" {
		return
	}

	subject := ns.parseTemplate(rule.SubjectTemplate, data)
	body := ns.parseTemplate(rule.BodyTemplate, data)
	
	log.Printf("[Notifier] Rule #%d - Parsed Subject: '%s', Has PURCHASE_ITEMS: %v, Has RAW_MATERIALS: %v", 
		rule.ID, subject, data["PURCHASE_ITEMS"] != nil, data["RAW_MATERIALS"] != nil)

	log.Printf("[Notifier] Rule #%d - Parsed Subject: '%s', Data STATUS: '%v'", rule.ID, subject, data["STATUS"])

	// Prepare recipient list
	var emailList []string

	// Helper to add emails to list
	addEmails := func(raw string) {
		if raw == "" { return }
		// Split by comma, semicolon or space
		parts := strings.FieldsFunc(raw, func(r rune) bool {
			return r == ',' || r == ';' || r == ' ' || r == '\n' || r == '\r' || r == '\t'
		})
		for _, email := range parts {
			clean := strings.TrimSpace(email)
			if clean != "" {
				emailList = append(emailList, clean)
			}
		}
	}

	log.Printf("[Notifier] Processing Rule #%d - RecipientEmails: '%s', ManualRecipients: '%s'", rule.ID, rule.RecipientEmails, rule.ManualRecipients)
	addEmails(rule.RecipientEmails)
	addEmails(rule.ManualRecipients)

	// Remove duplicates
	uniqueEmails := make([]string, 0)
	seen := make(map[string]bool)
	for _, e := range emailList {
		if !seen[e] {
			seen[e] = true
			uniqueEmails = append(uniqueEmails, e)
		}
	}
	emailList = uniqueEmails

	log.Printf("[Notifier] Final Email List for Rule #%d: %v", rule.ID, emailList)

	if len(emailList) > 0 {
		err := SendEmail(emailList, subject, body)
		if err != nil {
			log.Printf("Failed to send notification for rule #%d: %v", rule.ID, err)
		} else {
			log.Printf("Notification sent to %d recipients for rule #%d", len(emailList), rule.ID)
		}
	}
}

func (ns *NotificationService) parseTemplate(template string, data map[string]interface{}) string {
	result := template
	
	log.Printf("[parseTemplate] Input Template: %s", template)
	log.Printf("[parseTemplate] Data Keys: %v", getMapKeys(data))
	
	// Pre-process: handle literal backslash-n sequences from DB
	result = strings.ReplaceAll(result, "\\n", "\n")
	result = strings.ReplaceAll(result, "\\r", "\r")

	for key, value := range data {
		val := fmt.Sprintf("%v", value)
		
		// Aggressive replacement for the specific RAW_MATERIALS tag
		if strings.EqualFold(key, "RAW_MATERIALS") {
			result = strings.ReplaceAll(result, "{RAW_MATERIALS}", val)
			result = strings.ReplaceAll(result, "{raw_materials}", val)
			result = strings.ReplaceAll(result, "{Raw_Materials}", val)
			result = strings.ReplaceAll(result, "#{RAW_MATERIALS}", val)
			result = strings.ReplaceAll(result, "#{raw_materials}", val)
		}
		if strings.EqualFold(key, "PURCHASE_ITEMS") {
			result = strings.ReplaceAll(result, "{PURCHASE_ITEMS}", val)
			result = strings.ReplaceAll(result, "{purchase_items}", val)
			result = strings.ReplaceAll(result, "{Purchase_Items}", val)
			result = strings.ReplaceAll(result, "#{PURCHASE_ITEMS}", val)
			result = strings.ReplaceAll(result, "#{purchase_items}", val)
		}
		if strings.EqualFold(key, "SALE_ITEMS") {
			result = strings.ReplaceAll(result, "{SALE_ITEMS}", val)
			result = strings.ReplaceAll(result, "{sale_items}", val)
			result = strings.ReplaceAll(result, "{Sale_Items}", val)
			result = strings.ReplaceAll(result, "#{SALE_ITEMS}", val)
			result = strings.ReplaceAll(result, "#{sale_items}", val)
		}
		if strings.EqualFold(key, "NOTE") || strings.EqualFold(key, "PLANLAMA_NOTU") {
			result = strings.ReplaceAll(result, "{NOTE}", val)
			result = strings.ReplaceAll(result, "{note}", val)
			result = strings.ReplaceAll(result, "{Note}", val)
			result = strings.ReplaceAll(result, "{PLANLAMA_NOTU}", val)
			result = strings.ReplaceAll(result, "{planlama_notu}", val)
			result = strings.ReplaceAll(result, "{Planlama_Notu}", val)
			result = strings.ReplaceAll(result, "#{NOTE}", val)
			result = strings.ReplaceAll(result, "#{PLANLAMA_NOTU}", val)
		}

		upperKey := strings.ToUpper(key)
		result = strings.ReplaceAll(result, "{"+upperKey+"}", val)
		result = strings.ReplaceAll(result, "#{"+upperKey+"}", val)
		result = strings.ReplaceAll(result, "{"+key+"}", val)
		result = strings.ReplaceAll(result, "#{"+key+"}", val)
		result = strings.ReplaceAll(result, "{"+strings.ToLower(key)+"}", val)
	}

	// Post-process: convert all actual newlines to HTML breaks
	result = strings.ReplaceAll(result, "\r\n", "<br>")
	result = strings.ReplaceAll(result, "\n", "<br>")
	result = strings.ReplaceAll(result, "\r", "<br>")
	
	return result
}

func getMapKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}
