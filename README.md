# Twitter/X Archive System

> A clean, fast, self-hosted Twitter/X archive system for personal use. Save tweets, organize them by categories, and browse them with a beautiful dark-mode interface.

![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![PostgreSQL](https://img.shields.io/badge/postgresql-%3E%3D14.0-blue)

[Türkçe](#türkçe) | [English](#english)

---

## English

## Features

- Archive tweets by URL with automatic oEmbed fetching and parsing
- Custom categories - Create, rename, organize tweets your way
- Full-text search with emoji support
- Calendar view showing monthly tweet activity
- Statistics dashboard tracking archive growth
- Fully responsive design for mobile and desktop
- Export all tweets as JSON backup

## Tech Stack

| Layer | Technology | Why? |
|-------|------------|------|
| **Backend** | Node.js + Fastify | Fast, modern, async-first |
| **Database** | PostgreSQL | Robust, ACID compliant, full-text search |
| **Frontend** | Vanilla JS + CSS | No build step, instant startup |
| **Architecture** | RESTful API | Clean separation, easy to extend |

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mehmetakiftas/twitter-archive
   cd twitter-archive
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL credentials
   ```

4. **Setup database**
   ```bash
   npm run db:setup
   ```
   This creates the database, runs migrations, and you're ready to go!

5. **Start the server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

That's it! Start archiving tweets.

## Database Scripts

| Command | Description |
|---------|-------------|
| `npm run db:create` | Create the database |
| `npm run db:migrate` | Run migrations (create tables) |
| `npm run db:seed` | Add default categories |
| `npm run db:setup` | Run all of the above |
| `npm run db:check` | Test connection and show stats |
| `npm run db:reset` | Drop and recreate all tables (with confirmation) |
| `npm run db:drop` | Drop the entire database (with confirmation) |

## API Endpoints

### Tweets

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/tweets` | Archive a new tweet |
| GET | `/tweets` | List tweets with filters |
| DELETE | `/tweets/:id` | Delete a tweet |
| POST | `/tweets/:id/categories` | Update tweet categories |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/categories` | Create a category |
| GET | `/categories` | List all categories |
| DELETE | `/categories/:id` | Delete a category |

### Stats & Calendar

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats` | Get archive statistics |
| GET | `/calendar` | Get monthly tweet counts |
| GET | `/calendar/day` | Get tweets for a specific day |
| GET | `/export` | Export all tweets as JSON |

## Usage

### Adding a Tweet

1. Click the **"+ Add Tweet"** button
2. Paste a Twitter/X URL (e.g., `https://x.com/user/status/123456789`)
3. Optionally select categories
4. Click **"Archive Tweet"**

The system will:
- Fetch the tweet embed via oEmbed
- Extract the tweet text
- Decode the tweet timestamp from the Snowflake ID
- Store everything in the database

### Managing Categories

- Create categories from the sidebar
- Assign tweets to multiple categories
- Filter tweets by category
- Delete categories without affecting tweets

### Calendar View

- Navigate to the Calendar page
- Browse months to see tweet activity
- Click on a day to see all tweets from that day
- Each tweet shows a preview and link to the original

### Exporting Data

- Click the **"Export"** button in the top bar
- Downloads a JSON file with all your tweets and categories

## Architecture

```
┌─────────────────────────────────────────────┐
│  Frontend (Vanilla JS)                      │
│  • Main Page (tweet grid + filters)        │
│  • Calendar Page (monthly activity view)   │
└──────────────────┬──────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────┐
│  Backend (Node.js + Fastify)                │
│  • Tweet Routes (oEmbed fetching)           │
│  • Category Routes (CRUD)                   │
│  • Stats & Calendar Routes                  │
└──────────────────┬──────────────────────────┘
                   │ SQL Queries
┌──────────────────▼──────────────────────────┐
│  PostgreSQL Database                        │
│  • tweets (with full-text search)          │
│  • categories (with tweet counts)           │
│  • tweet_categories (many-to-many)          │
└─────────────────────────────────────────────┘
```

## Key Implementation Details

- **Snowflake ID Decoding** - Extracts tweet timestamps from Twitter's Snowflake IDs
- **Transaction Safety** - All multi-step operations wrapped in database transactions
- **Smart Caching** - Categories cached in localStorage with 60s TTL
- **Parallel Loading** - API calls execute concurrently for faster page loads
- **Response Compression** - gzip/brotli reduces bandwidth by 70-80%
- **Rate Limiting** - 100 requests/minute to prevent abuse
- **URL Validation** - Only accepts twitter.com/x.com URLs
- **Fetch Timeout** - 10-second timeout prevents hanging requests
- **Configurable Timezone** - Set via TZ environment variable

## Known Limitations

- Single-user system (no multi-user support or authentication)
- Requires tweet to be public (oEmbed doesn't work for private/deleted tweets)
- Only main tweet content is stored (doesn't follow threads)
- Twitter embed loading depends on Twitter's servers (can be slow)

---

_This project is designed for local, personal use. It includes no authentication or multi-user features by design._


---
---

## Türkçe

## Özellikler

- URL ile tweet arşivleme - otomatik oEmbed çekme ve ayrıştırma
- Özel kategoriler - Kendi yönteminizle oluşturun, yeniden adlandırın, düzenleyin
- Emoji desteğiyle tam metin arama
- Aylık tweet etkinliğini gösteren takvim görünümü
- Arşiv büyümesini takip eden istatistik panosu
- Mobil ve masaüstü için tam responsive tasarım
- Tüm tweetleri JSON olarak dışa aktarma

## Kullanılan Teknolojiler

| Katman | Teknoloji | Neden? |
|--------|-----------|--------|
| **Backend** | Node.js + Fastify | Hızlı, modern, async-first |
| **Veritabanı** | PostgreSQL | Sağlam, ACID uyumlu, tam metin arama |
| **Frontend** | Vanilla JS + CSS | Build adımı yok, anında başlangıç |
| **Mimari** | RESTful API | Temiz ayrım, kolay genişletme |

## Hızlı Başlangıç

### Gereksinimler

- Node.js 18+
- PostgreSQL 14+

### Kurulum

1. **Depoyu klonlayın**
   ```bash
   git clone https://github.com/mehmetakiftas/twitter-archive
   cd twitter-archive
   ```

2. **Bağımlılıkları yükleyin**
   ```bash
   npm install
   ```

3. **Ortam yapılandırması**
   ```bash
   cp .env.example .env
   # .env dosyasını PostgreSQL bilgilerinizle düzenleyin
   ```

4. **Veritabanını kurun**
   ```bash
   npm run db:setup
   ```
   Bu komut veritabanını oluşturur, migrasyonları çalıştırır ve hazırsınız!

5. **Sunucuyu başlatın**
   ```bash
   npm run dev
   ```

6. **Tarayıcınızı açın**
   ```
   http://localhost:3000
   ```

Bu kadar! Tweet arşivlemeye başlayın.

## Veritabanı Komutları

| Komut | Açıklama |
|-------|----------|
| `npm run db:create` | Veritabanını oluştur |
| `npm run db:migrate` | Migrasyonları çalıştır (tabloları oluştur) |
| `npm run db:seed` | Varsayılan kategorileri ekle |
| `npm run db:setup` | Yukarıdakilerin hepsini çalıştır |
| `npm run db:check` | Bağlantıyı test et ve istatistikleri göster |
| `npm run db:reset` | Tüm tabloları sil ve yeniden oluştur (onaylı) |
| `npm run db:drop` | Tüm veritabanını sil (onaylı) |

## API Endpoints

### Tweetler

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/tweets` | Yeni bir tweet arşivle |
| GET | `/tweets` | Filtreyle tweetleri listele |
| DELETE | `/tweets/:id` | Bir tweeti sil |
| POST | `/tweets/:id/categories` | Tweet kategorilerini güncelle |

### Kategoriler

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/categories` | Kategori oluştur |
| GET | `/categories` | Tüm kategorileri listele |
| DELETE | `/categories/:id` | Bir kategoriyi sil |

### İstatistikler ve Takvim

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/stats` | Arşiv istatistiklerini al |
| GET | `/calendar` | Aylık tweet sayılarını al |
| GET | `/calendar/day` | Belirli bir günün tweetlerini al |
| GET | `/export` | Tüm tweetleri JSON olarak dışa aktar |

## Kullanım

### Tweet Ekleme

1. **"+ Add Tweet"** düğmesine tıklayın
2. Twitter/X URL'sini yapıştırın (örn: `https://x.com/user/status/123456789`)
3. İsteğe bağlı olarak kategorileri seçin
4. **"Archive Tweet"** düğmesine tıklayın

Sistem şunları yapacak:
- oEmbed aracılığıyla tweet gömülü kodunu getirir
- Tweet metnini çıkarır
- Snowflake ID'den tweet zaman damgasını çözer
- Her şeyi veritabanına kaydeder

### Kategori Yönetimi

- Kenar çubuğundan kategoriler oluşturun
- Tweetleri birden fazla kategoriye atayın
- Tweetleri kategoriye göre filtreleyin
- Kategorileri tweetleri etkilemeden silin

### Takvim Görünümü

- Takvim sayfasına gidin
- Tweet etkinliğini görmek için ayları gezin
- O günün tüm tweetlerini görmek için bir güne tıklayın
- Her tweet bir önizleme ve orijinalin bağlantısını gösterir

### Veri Dışa Aktarma

- Üst çubuktaki **"Export"** düğmesine tıklayın
- Tüm tweetleriniz ve kategorilerinizle bir JSON dosyası indirir

## Mimari

```
┌─────────────────────────────────────────────┐
│  Frontend (Vanilla JS)                      │
│  • Ana Sayfa (tweet ızgarası + filtreler)  │
│  • Takvim Sayfası (aylık aktivite)         │
└──────────────────┬──────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────┐
│  Backend (Node.js + Fastify)                │
│  • Tweet Rotaları (oEmbed çekme)            │
│  • Kategori Rotaları (CRUD)                 │
│  • İstatistik ve Takvim Rotaları           │
└──────────────────┬──────────────────────────┘
                   │ SQL Sorguları
┌──────────────────▼──────────────────────────┐
│  PostgreSQL Veritabanı                      │
│  • tweets (tam metin arama ile)            │
│  • categories (tweet sayıları ile)          │
│  • tweet_categories (çoktan çoğa)           │
└─────────────────────────────────────────────┘
```

## Önemli Uygulama Detayları

- **Snowflake ID Çözme** - Twitter'ın Snowflake ID'lerinden tweet zaman damgalarını çıkarır
- **Transaction Güvenliği** - Tüm çok adımlı işlemler veritabanı transaction'larında sarılı
- **Akıllı Önbellekleme** - Kategoriler 60 saniyelik TTL ile localStorage'da önbelleğe alınır
- **Paralel Yükleme** - API çağrıları daha hızlı sayfa yüklemeleri için eşzamanlı çalışır
- **Yanıt Sıkıştırma** - gzip/brotli bant genişliğini %70-80 azaltır
- **Hız Sınırlama** - Kötüye kullanımı önlemek için dakikada 100 istek
- **URL Doğrulama** - Yalnızca twitter.com/x.com URL'lerini kabul eder
- **Fetch Zaman Aşımı** - 10 saniyelik zaman aşımı takılı istekleri önler
- **Yapılandırılabilir Saat Dilimi** - TZ ortam değişkeni ile ayarlayın

## Bilinen Sınırlamalar

- Tek kullanıcılı sistem (çoklu kullanıcı desteği veya kimlik doğrulama yok)
- Tweet'in herkese açık olması gerekir (oEmbed özel/silinmiş tweetler için çalışmaz)
- Yalnızca ana tweet içeriği saklanır (thread'leri takip etmez)
- Twitter embed yükleme Twitter'ın sunucularına bağlıdır (yavaş olabilir)

---

_Bu proje yerel, kişisel kullanım için tasarlanmıştır. Tasarım gereği kimlik doğrulama veya çoklu kullanıcı özellikleri içermez._

---

<p align="center">
  <img src="public/built-in-turkiye.svg" alt="Built in Türkiye" width="200">
</p>
