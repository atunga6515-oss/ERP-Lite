# ERP Lite - Profesyonel Depo, Üretim ve Bildirim Yönetim Sistemi

![ERP Lite Banner](https://img.shields.io/badge/ERP--Lite-Modern--Inventory--Management-blue?style=for-the-badge)
![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![Next.js](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)

ERP Lite, küçük ve orta ölçekli işletmelerin satınalma, üretim, depo ve satış süreçlerini tek bir merkezden, modern bir arayüz ve akıllı bildirim sistemi ile yönetmelerini sağlayan tam kapsamlı bir kurumsal kaynak planlama çözümüdür.

## 🚀 Öne Çıkan Özellikler

*   **Akıllı Bildirim Motoru:** Kritik stok seviyeleri, yeni iş emirleri veya satışlar gerçekleştiğinde özelleştirilebilir HTML şablonları ile otomatik e-posta bilgilendirmesi.
*   **Dinamik Üretim Planlama:** Reçete (BOM) yönetimi, hammadde ihtiyaç analizi ve otomatik stok sarfiyatı ile iş emri takibi.
*   **Satış ve Sevkiyat Masası:** Atomik işlem yapısı ile satış sırasında stoklardan otomatik düşüş ve satış iptalinde stokların iadesi.
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

### 💰 Satış ve Satınalma
*   **Satış:** Müşteri bazlı satış, sepet yönetimi ve anlık stok düşümü.
*   **Satınalma:** Tedarikçiden sipariş geçme ve depo girişlerinin kontrolü.

### ⚙️ Yönetim Paneli (Admin)
*   Bildirim kuralları oluşturma (Hangi olayda kime mail gidecek?).
*   Sürükle-bırak veya HTML şablon düzenleyici ile mail içeriklerini yönetme.

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
*   **ORM:** GORM (SQLite desteği ile)
*   **Bildirim:** SMTP entegrasyonlu özel bildirim servisi

### Frontend
*   **Framework:** Next.js (App Router)
*   **UI:** Tailwind CSS & Shadcn/UI
*   **İkonlar:** Lucide React
*   **Veri İşleme:** XLSX & PapaParse

---

## ⚙️ Kurulum Rehberi

### Gereksinimler
*   Go (v1.20+)
*   Node.js (v18+)
*   NPM veya Yarn

### 1. Backend Kurulumu
```bash
cd backend
go mod tidy
go run main.go
```
*Backend varsayılan olarak `http://localhost:8080` adresinde çalışacaktır.*

### 2. Frontend Kurulumu
```bash
cd frontend
npm install
npm run dev
```
*Frontend varsayılan olarak `http://localhost:3000` adresinde çalışacaktır.*

---

## 📄 Lisans
Bu proje MIT lisansı ile lisanslanmıştır. Daha fazla bilgi için `LICENSE` dosyasına bakabilirsiniz.

---
*Geliştiren: Alper Tunga & Antigravity AI*
