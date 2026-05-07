package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"erp-lite-backend/database"
	"erp-lite-backend/models"
	"erp-lite-backend/services"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

// Login request structure
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	var user models.User
	if err := database.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Kullanıcı bulunamadı"})
	}

	if user.Status != "Active" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Hesabınız pasif durumdadır"})
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Hatalı şifre"})
	}

	// Load permissions
	var permissions []models.Permission
	database.DB.Where("user_id = ?", user.ID).Find(&permissions)

	// Generate a simple token for now (In a real app, use JWT)
	token := fmt.Sprintf("dummy-token-%d-%d", user.ID, time.Now().Unix())

	return c.JSON(fiber.Map{
		"token":       token,
		"user":        user,
		"permissions": permissions,
	})
}

func CreateUser(c *fiber.Ctx) error {
	type UserReq struct {
		Username    string              `json:"username"`
		Email       string              `json:"email"`
		Password    string              `json:"password"`
		IsAdmin     bool                `json:"is_admin"`
		Permissions []models.Permission `json:"permissions"`
	}
	var req UserReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	var tempPass string
	if req.Password != "" {
		tempPass = req.Password
	} else {
		tempPass = "temp123!" // Bu şifre ilk girişte değiştirilecek
	}
	hashedPass, _ := bcrypt.GenerateFromPassword([]byte(tempPass), 10)

	user := models.User{
		Username: req.Username,
		Email:    req.Email,
		Password: string(hashedPass),
		IsAdmin:  req.IsAdmin,
		Status:   "Active",
	}

	if err := database.DB.Create(&user).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Kullanıcı veya E-posta zaten mevcut"})
	}

	// 2. Save Permissions
	for _, p := range req.Permissions {
		p.UserID = user.ID
		database.DB.Create(&p)
	}

	// 3. Generate Reset Token and Send Email
	tokenBytes := make([]byte, 32)
	rand.Read(tokenBytes)
	token := hex.EncodeToString(tokenBytes)

	resetToken := models.ResetToken{
		UserID:    user.ID,
		Token:     token,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	database.DB.Create(&resetToken)

	// Frontend URL for password setting
	resetLink := fmt.Sprintf("http://localhost:3000/sifre-belirle?token=%s", token)
	
	// Send Email
	go func() {
		err := services.SendWelcomeEmail(user, resetLink)
		if err != nil {
			fmt.Printf("Error sending email: %v\n", err)
		}
	}()

	return c.JSON(fiber.Map{"message": "Kullanıcı oluşturuldu ve hoş geldin maili gönderildi", "user_id": user.ID})
}

func ResendWelcomeEmail(c *fiber.Ctx) error {
	id := c.Params("id")
	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Kullanıcı bulunamadı"})
	}

	// Delete old tokens
	database.DB.Where("user_id = ?", user.ID).Delete(&models.ResetToken{})

	// Generate new token
	tokenBytes := make([]byte, 32)
	rand.Read(tokenBytes)
	token := hex.EncodeToString(tokenBytes)

	resetToken := models.ResetToken{
		UserID:    user.ID,
		Token:     token,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	database.DB.Create(&resetToken)

	resetLink := fmt.Sprintf("http://localhost:3000/sifre-belirle?token=%s", token)
	
	// Send Email
	go func() {
		err := services.SendWelcomeEmail(user, resetLink)
		if err != nil {
			fmt.Printf("Error resending email: %v\n", err)
		}
	}()

	return c.JSON(fiber.Map{"message": "Davet maili yeniden gönderildi"})
}

func UpdateUser(c *fiber.Ctx) error {
	id := c.Params("id")
	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Kullanıcı bulunamadı"})
	}

	type UpdateReq struct {
		Email       string              `json:"email"`
		Password    string              `json:"password"`
		IsAdmin     *bool               `json:"is_admin"`
		Permissions []models.Permission `json:"permissions"`
	}
	var req UpdateReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Geçersiz veri"})
	}

	if req.Email != "" {
		user.Email = req.Email
	}
	if req.IsAdmin != nil {
		user.IsAdmin = *req.IsAdmin
	}
	if req.Password != "" {
		hashedPass, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
		user.Password = string(hashedPass)
	}

	database.DB.Save(&user)

	if req.Permissions != nil {
		database.DB.Where("user_id = ?", user.ID).Delete(&models.Permission{})
		for _, p := range req.Permissions {
			p.UserID = user.ID
			p.ID = 0 // Reset ID to ensure new record creation
			database.DB.Create(&p)
		}
	}

	return c.JSON(fiber.Map{"message": "Kullanıcı başarıyla güncellendi", "user": user})
}

func GetUsers(c *fiber.Ctx) error {
	var users []models.User
	database.DB.Preload("Permissions").Find(&users)
	return c.JSON(users)
}

func UpdateUserPermissions(c *fiber.Ctx) error {
	id, _ := c.ParamsInt("id")
	var permissions []models.Permission
	if err := c.BodyParser(&permissions); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	// Delete old permissions and save new ones
	database.DB.Where("user_id = ?", id).Delete(&models.Permission{})
	for _, p := range permissions {
		p.UserID = uint(id)
		p.ID = 0
		database.DB.Create(&p)
	}

	return c.JSON(fiber.Map{"message": "Yetkiler güncellendi"})
}

func ResetPassword(c *fiber.Ctx) error {
	type Req struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	var resetToken models.ResetToken
	if err := database.DB.Where("token = ? AND expires_at > ?", req.Token, time.Now()).First(&resetToken).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Geçersiz veya süresi dolmuş bağlantı"})
	}

	hashedPass, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
	database.DB.Model(&models.User{}).Where("id = ?", resetToken.UserID).Update("password", string(hashedPass))
	
	// Token'ı sil
	database.DB.Delete(&resetToken)

	return c.JSON(fiber.Map{"message": "Şifreniz başarıyla güncellendi"})
}

func ForgotPassword(c *fiber.Ctx) error {
	type Req struct {
		Email string `json:"email"`
	}
	var req Req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}

	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// Güvenlik için kullanıcı bulunamasa bile başarılı mesajı ver
		return c.JSON(fiber.Map{"message": "Kayıtlı e-posta adresine sıfırlama bağlantısı gönderildi."})
	}

	// Eski token'ları temizle
	database.DB.Where("user_id = ?", user.ID).Delete(&models.ResetToken{})

	// Yeni token oluştur
	tokenBytes := make([]byte, 32)
	rand.Read(tokenBytes)
	token := hex.EncodeToString(tokenBytes)

	resetToken := models.ResetToken{
		UserID:    user.ID,
		Token:     token,
		ExpiresAt: time.Now().Add(30 * time.Minute),
	}
	database.DB.Create(&resetToken)

	resetLink := fmt.Sprintf("http://localhost:3000/sifre-belirle?token=%s", token)
	go services.SendPasswordResetEmail(user.Email, resetLink)

	return c.JSON(fiber.Map{"message": "Kayıtlı e-posta adresine sıfırlama bağlantısı gönderildi."})
}
