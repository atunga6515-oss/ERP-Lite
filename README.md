# ERP Lite - Profesyonel Depo, Üretim ve Bildirim Yönetim Sistemi

![ERP Lite Banner](https://img.shields.io/badge/ERP--Lite-Modern--Inventory--Management-blue?style=for-the-badge)
![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![Next.js](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgresql-4169e1?style=for-the-badge&logo=postgresql&logoColor=white)

ERP Lite, küçük ve orta ölçekli işletmelerin satınalma, üretim, depo ve satış süreçlerini tek bir merkezden, modern bir arayüz ve akıllı bildirim sistemi ile yönetmelerini sağlayan tam kapsamlı bir kurumsal kaynak planlama çözümüdür.

## 🚀 Öne Çıkan Özellikler

*   **Akıllı Bildirim Motoru:** Kritik stok seviyeleri, yeni iş emirleri veya satışlar gerçekleştiğinde özelleştirilebilir HTML şablonları ile otomatik e-posta bilgilendirmesi.
*   **Profesyonel Teklif Sistemi (v1.3.0):** USD, EUR ve TL para birimleri ile teklif hazırlama, şirket logolu ve Türkçe karakter destekli PDF dışa aktarma.
*   **Dinamik Üretim Planlama:** Reçete (BOM) yönetimi, hammadde ihtiyaç analizi ve otomatik stok sarfiyatı ile iş emri takibi.
*   **Satış ve Sevkiyat Masası:** Tekliflerin tek tıkla satışa dönüştürülmesi ve sevkiyat masası üzerinden depo stok kontrolü ile kontrollü çıkış.
*   **Profesyonel Satınalma Akışı:** Sipariş hazırlama, tedarikçi yönetimi ve kademeli mal kabul (depoya giriş) süreçleri.
*   **Gelişmiş Arama:** Türkçe karakter duyarlı (İ-i, I-ı) hızlı arama ve filtreleme özellikleri.
*   **Veri Yönetimi:** Excel/CSV ile toplu ürün ve müşteri içe/dışa aktarma desteği.

---

## 🛠 Modüller ve Fonksiyonlar

### 📦 Depo ve Stok Yönetimi
*   Birden fazla depo tanımı ve depolar arası transfer.
*   Kritik stok seviyesi takibi ve görsel uyarılar.
*   Detaylı stok hareket geçmişi ve envanter analizi.

### 🔨 Üretim Planlama & İş Emirleri
*   Ürün reçeteleri (BOM) oluşturma.
*   İş emri oluşturma sırasında hammadde yeterlilik analizi.
*   Üretime başlama ve tamamlama süreçlerinin takibi.

### 💰 Satış, Satınalma ve Teklif Yönetimi
*   **Teklif Yönetimi (v1.3.0):** USD/EUR/TL bazlı profesyonel teklif hazırlama, PDF çıktısı ve tek tıkla satışa dönüştürme.
*   **Satış:** Müşteri bazlı satış, sepet yönetimi ve sevkiyat masası entegrasyonu.
*   **Satınalma:** Tedarikçiden sipariş geçme ve depo girişlerinin kontrolü.

### ⚙️ Yönetim Paneli (Admin)
*   **Teklif Veren Şirketler (v1.3.0):** Teklif formlarında görünecek farklı şirket profillerini ve logolarını yönetme.
*   **Bildirim Kuralları:** Kritik stok seviyesi veya yeni siparişlerde otomatik e-posta gönderimi.
*   **Kullanıcı Yetkilendirme:** Modül bazlı erişim kontrolü.

---

## 🔄 İş Akışı (Workflow)

1.  **Tanımlama:** Ürünler, Hammaddeler ve Reçeteler sisteme girilir.
2.  **Satınalma:** Eksik hammaddeler için tedarikçilere sipariş geçilir ve mal kabulü ile stoklar güncellenir.
3.  **Üretim:** Gelen hammaddeler ile İş Emirleri başlatılır. Üretim tamamlandığında hammaddeler düşer, mamul stoğu artar.
4.  **Satış:** Bitmiş ürünler Satış Masası üzerinden müşterilere sevk edilir.
5.  **Bildirim:** Tüm bu adımlarda ilgili birimler otomatik maillerle bilgilendirilir.

---

## 💻 Teknoloji Yığını

### Backend
*   **Dil:** Go (Golang)
*   **Framework:** Fiber (Yüksek performanslı web framework)
*   **ORM:** GORM (PostgreSQL desteği ile)
*   **Bildirim:** SMTP entegrasyonlu özel bildirim servisi

### Frontend
*   **Framework:** Next.js (App Router)
*   **UI:** Tailwind CSS & Shadcn/UI
*   **İkonlar:** Lucide React
*   **Veri İşleme:** XLSX & PapaParse

---

## ⚙️ Kurulum Rehberi (Adım Adım)

Uygulamayı hem kendi bilgisayarınıza (localhost) hem de bir sunucuya (örneğin Ubuntu) kurup ağdaki diğer cihazlardan erişime açabilirsiniz.

### 📋 Gereksinimler
Kuruluma başlamadan önce sunucunuzda/bilgisayarınızda şunların kurulu olduğundan emin olun:
1.  **PostgreSQL** (Veritabanı için)
2.  **Go** (v1.20 veya üzeri - Backend için)
3.  **Node.js** (v18 veya üzeri) ve **npm** (Frontend için)
4.  **Git** (Projeyi indirmek için)

---

### Adım 1: Projeyi İndirin
Terminali açın ve projeyi GitHub'dan bilgisayarınıza/sunucunuza indirin:
```bash
git clone https://github.com/KULLANICI_ADINIZ/ERP-Lite.git
cd ERP-Lite
```

---

### Adım 2: Veritabanı (PostgreSQL) Hazırlığı
Backend'in çalışabilmesi için PostgreSQL üzerinde bir veritabanı ve kullanıcı oluşturmanız gerekir. (GORM tabloları otomatik oluşturacaktır, sadece boş veritabanı yeterlidir).

**Ubuntu / Linux için PostgreSQL Kurulumu ve Ayarı:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# PostgreSQL komut satırına girin
sudo -u postgres psql

# Kullanıcı, şifre ve veritabanı oluşturun (Kendinize göre değiştirebilirsiniz)
CREATE USER alpertunga WITH PASSWORD 'sifreniz';
CREATE DATABASE erp_lite OWNER alpertunga;
GRANT ALL PRIVILEGES ON DATABASE erp_lite TO alpertunga;
\q
```

---

### Adım 3: Backend Kurulumu ve Başlatılması
Backend, veritabanına bağlanıp tüm tabloları ve varsayılan "admin" kullanıcısını otomatik oluşturacaktır.

1. Backend klasörüne girin:
```bash
cd backend
```

2. Gerekli kütüphaneleri indirin:
```bash
go mod tidy
```

3. **ÖNEMLİ:** Veritabanı bağlantı adresinizi sisteme tanıtın (Bir önceki adımda belirlediğiniz kullanıcı adı, şifre ve db adını kullanın):
```bash
export DATABASE_URL="host=localhost user=alpertunga password=sifreniz dbname=erp_lite port=5432 sslmode=disable"
```

4. Backend'i çalıştırın:
```bash
go run main.go
```
*(Başarılı olursa terminalde "Connected Successfully to Database" ve "Migrations and Seeding completed" mesajlarını göreceksiniz. Backend artık `8080` portunda çalışıyor.)*

---

### Adım 4: Frontend Kurulumu ve Başlatılması
Yeni bir terminal sekmesi açın ve proje ana dizinine dönüp frontend klasörüne girin.

1. Klasöre girin:
```bash
cd frontend
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. Frontend'i çalıştırın:
```bash
npm run dev
```

*(Uygulama `3000` portunda çalışmaya başlayacaktır.)*

---

### 🌐 Ağ (Network) Üzerinden Uygulamaya Erişim
Frontend kodlarımız **Ağa Duyarlı (Network Aware)** olarak tasarlanmıştır.

*   **Sunucu Üzerinden (Lokal):** Eğer işlemleri yaptığınız makinedeyseniz tarayıcıdan `http://localhost:3000` adresine girin.
*   **Farklı Bir Cihazdan (Ağ üzerinden):** Eğer uygulamayı bir Ubuntu sunucuya (örneğin IP: 192.168.1.100) kurduysanız, ofisteki herhangi bir telefon veya bilgisayarın tarayıcısına `http://192.168.1.100:3000` yazarak sisteme girebilirsiniz. Uygulama otomatik olarak o IP adresi üzerinden Backend ile iletişim kuracaktır.

**Varsayılan Giriş Bilgileri:**
*   **Kullanıcı Adı:** `admin`
*   **Şifre:** `admin123`
*(Sisteme girdikten sonra lütfen şifrenizi değiştirin.)*

---

## 📄 Lisans
Bu proje MIT lisansı ile lisanslanmıştır. Daha fazla bilgi için `LICENSE` dosyasına bakabilirsiniz.

---
*Geliştiren: Alper Tunga & Antigravity AI*
