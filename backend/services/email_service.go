package services

import (
	"crypto/tls"
	"erp-lite-backend/database"
	"erp-lite-backend/models"
	"fmt"
	"net/smtp"
	"errors"
	"time"
	"strings"
	"log"
)

type loginAuth struct {
	username, password string
}

func LoginAuth(username, password string) smtp.Auth {
	return &loginAuth{username, password}
}

func (a *loginAuth) Start(server *smtp.ServerInfo) (string, []byte, error) {
	return "LOGIN", []byte{}, nil
}

func (a *loginAuth) Next(fromServer []byte, more bool) ([]byte, error) {
	if more {
		switch string(fromServer) {
		case "Username:":
			return []byte(a.username), nil
		case "Password:":
			return []byte(a.password), nil
		default:
			return nil, errors.New("Unknown fromServer: " + string(fromServer))
		}
	}
	return nil, nil
}

func SendWelcomeEmail(user models.User, resetLink string) error {
	subject := "ERP Lite Sistemine Hoş Geldiniz!"
	body := fmt.Sprintf(`
		<h2 style="color: #2563eb;">Merhaba %s,</h2>
		<p>ERP Lite sisteminde hesabınız başarıyla oluşturuldu.</p>
		<p>Sisteme giriş yapmak için kendi şifrenizi aşağıdaki bağlantı üzerinden belirleyebilirsiniz:</p>
		<a href="%s" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Şifre Belirle & Giriş Yap</a>
		<br><br>
		<p>Bu bağlantı 24 saat geçerlidir.</p>
	`, user.Username, resetLink)

	return SendEmail([]string{user.Email}, subject, body)
}

func SendPasswordResetEmail(email string, resetLink string) error {
	subject := "Şifre Sıfırlama Talebi - ERP Lite"
	body := fmt.Sprintf(`
		<h2>Şifre Sıfırlama Talebi</h2>
		<p>Hesabınız için şifre sıfırlama talebinde bulunuldu. Eğer bu işlemi siz yapmadıysanız bu maili dikkate almayın.</p>
		<p>Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
		<a href="%s" style="display: inline-block; padding: 10px 20px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 5px;">Şifremi Sıfırla</a>
		<p>Bu bağlantı 30 dakika geçerlidir.</p>
	`, resetLink)

	return SendEmail([]string{email}, subject, body)
}

func SendEmail(targetEmails []string, subject string, body string) error {
	var settings []models.Setting
	database.DB.Find(&settings)
	settingsMap := make(map[string]string)
	for _, s := range settings {
		settingsMap[s.Key] = s.Value
	}

	from := settingsMap["smtp_email"]
	password := settingsMap["smtp_password"]
	smtpProvider := settingsMap["smtp_provider"]
	smtpHost := settingsMap["smtp_host"]
	smtpPort := settingsMap["smtp_port"]

	if smtpProvider != "custom" {
		smtpHost = "smtp.gmail.com"
		smtpPort = "465"
	}
	if smtpHost == "" || smtpPort == "" {
		return fmt.Errorf("SMTP sunucu ayarları eksik")
	}
	if from == "" || password == "" {
		return fmt.Errorf("SMTP kullanıcı adı veya şifre eksik")
	}

	log.Printf("[EmailService] Using Settings: Host=%s, Port=%s, From=%s, Provider=%s", smtpHost, smtpPort, from, smtpProvider)

	htmlTemplate := `
		<!DOCTYPE html>
		<html>
		<head><meta charset="UTF-8"></head>
		<body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f8fafc;">
			<div style="padding: 20px; max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; margin-top: 20px;">
				<div style="border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px;">
					<h2 style="color: #1e293b; margin: 0;">ERP Lite Bildirimi</h2>
				</div>
				<div style="color: #334155; line-height: 1.6; font-size: 15px;">
					{{CONTENT}}
				</div>
				<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 12px; text-align: center;">
					<p>Bu bir otomatik bilgilendirme mailidir. Lütfen yanıtlamayınız.</p>
					<p>&copy; 2026 ERP Lite Management System</p>
				</div>
			</div>
		</body>
		</html>
	`
	htmlBody := strings.Replace(htmlTemplate, "{{CONTENT}}", body, 1)

	var auth smtp.Auth
	if smtpProvider == "custom" {
		auth = LoginAuth(from, password)
	} else {
		auth = smtp.PlainAuth("", from, password, smtpHost)
	}

	tlsconfig := &tls.Config{
		InsecureSkipVerify: true,
		ServerName:         smtpHost,
	}

	successCount := 0
	for i, rawTo := range targetEmails {
		cleanTo := strings.TrimSpace(rawTo)
		if strings.Contains(cleanTo, "<") && strings.Contains(cleanTo, ">") {
			parts := strings.Split(cleanTo, "<")
			if len(parts) > 1 {
				cleanTo = strings.Split(parts[1], ">")[0]
			}
		}
		cleanTo = strings.Trim(cleanTo, ". ")
		if cleanTo == "" { continue }

		log.Printf("[EmailService] Sending to %s (%d/%d). Subject: '%s'", cleanTo, i+1, len(targetEmails), subject)

		var client *smtp.Client
		var err error
		if smtpPort == "465" {
			conn, err := tls.Dial("tcp", smtpHost+":"+smtpPort, tlsconfig)
			if err != nil {
				log.Printf("[EmailService] SSL Dial Error for %s: %v", cleanTo, err)
				continue
			}
			client, err = smtp.NewClient(conn, smtpHost)
			if err != nil { continue }
		} else {
			c, err := smtp.Dial(smtpHost + ":" + smtpPort)
			if err != nil {
				log.Printf("[EmailService] Dial Error for %s: %v", cleanTo, err)
				continue
			}
			if err = c.StartTLS(tlsconfig); err != nil {
				log.Printf("[EmailService] StartTLS Error for %s: %v", cleanTo, err)
				c.Quit()
				continue
			}
			client = c
		}

		if err := client.Auth(auth); err != nil {
			log.Printf("[EmailService] Auth Error for %s: %v", cleanTo, err)
			client.Quit()
			continue
		}
		if err := client.Mail(from); err != nil {
			log.Printf("[EmailService] MAIL FROM Error for %s: %v", cleanTo, err)
			client.Quit()
			continue
		}
		if err := client.Rcpt(cleanTo); err != nil {
			log.Printf("[EmailService] RCPT TO Error for %s: %v", cleanTo, err)
			client.Quit()
			continue
		}

		w, err := client.Data()
		if err != nil {
			log.Printf("[EmailService] DATA Error for %s: %v", cleanTo, err)
			client.Quit()
			continue
		}

		date := time.Now().Format(time.RFC1123Z)
		fromParts := strings.Split(from, "@")
		domain := "erp-lite.local"
		if len(fromParts) > 1 { domain = fromParts[1] }
		messageID := fmt.Sprintf("<%d.%s@%s>", time.Now().UnixNano(), fromParts[0], domain)
		
		header := fmt.Sprintf("From: ERP Lite Notification <%s>\r\n", from)
		header += fmt.Sprintf("To: %s\r\n", cleanTo)
		header += fmt.Sprintf("Subject: %s\r\n", subject)
		header += fmt.Sprintf("Date: %s\r\n", date)
		header += fmt.Sprintf("Message-ID: %s\r\n", messageID)
		header += "MIME-version: 1.0;\r\nContent-Type: text/html; charset=\"UTF-8\";\r\n\r\n"

		w.Write([]byte(header + htmlBody))
		w.Close()
		client.Quit()
		successCount++
		log.Printf("[EmailService] SUCCESS: Delivered to %s", cleanTo)
		
		time.Sleep(1 * time.Second)
	}

	if successCount == 0 && len(targetEmails) > 0 {
		return fmt.Errorf("Mailler gönderilemedi")
	}
	return nil
}
