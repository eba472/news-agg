-- News Sources Table
CREATE TABLE IF NOT EXISTS news_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  country VARCHAR(2) NOT NULL,
  language VARCHAR(10) NOT NULL,
  scraper_type VARCHAR(50) NOT NULL, -- 'rss', 'html', 'api'
  scraper_config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Articles Table
CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  source_id INT REFERENCES news_sources(id),
  title VARCHAR(1000) NOT NULL,
  title_en VARCHAR(1000),
  url VARCHAR(2000) UNIQUE NOT NULL,
  content TEXT,
  summary TEXT,
  author VARCHAR(255),
  published_at TIMESTAMP,
  scraped_at TIMESTAMP DEFAULT NOW(),
  image_url VARCHAR(1000),
  language VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on URL for faster duplicate checking
CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source_id ON articles(source_id);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  name_mn VARCHAR(100),
  name_en VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Article Categories (many-to-many)
CREATE TABLE IF NOT EXISTS article_categories (
  article_id INT REFERENCES articles(id) ON DELETE CASCADE,
  category_id INT REFERENCES categories(id) ON DELETE CASCADE,
  confidence_score DECIMAL(3,2) DEFAULT 1.00,
  PRIMARY KEY (article_id, category_id)
);

-- Newsletters Table
CREATE TABLE IF NOT EXISTS newsletters (
  id SERIAL PRIMARY KEY,
  subject VARCHAR(255) NOT NULL,
  sent_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'draft',
  substack_post_id VARCHAR(255),
  recipient_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Newsletter Articles
CREATE TABLE IF NOT EXISTS newsletter_articles (
  newsletter_id INT REFERENCES newsletters(id) ON DELETE CASCADE,
  article_id INT REFERENCES articles(id) ON DELETE CASCADE,
  position INT,
  PRIMARY KEY (newsletter_id, article_id)
);

-- Insert default categories
INSERT INTO categories (name, name_mn, name_en) VALUES
  ('Politics', 'Улс төр', 'Politics'),
  ('Business', 'Бизнес', 'Business'),
  ('Technology', 'Технологи', 'Technology'),
  ('Sports', 'Спорт', 'Sports'),
  ('Entertainment', 'Үзвэр наадам', 'Entertainment'),
  ('Health', 'Эрүүл мэнд', 'Health'),
  ('Science', 'Шинжлэх ухаан', 'Science'),
  ('World', 'Дэлхий', 'World'),
  ('Local', 'Дотоод', 'Local'),
  ('Economy', 'Эдийн засаг', 'Economy')
ON CONFLICT (name) DO NOTHING;

-- Insert news sources
INSERT INTO news_sources (name, url, country, language, scraper_type, scraper_config) VALUES
  -- Mongolian Sources
  ('News.mn', 'https://news.mn', 'MN', 'mn', 'html', '{"selectors": {"article": ".news-item", "title": ".title", "link": "a", "date": ".date"}}'),
  ('Montsame', 'https://montsame.mn/mn', 'MN', 'mn', 'html', '{"selectors": {"article": ".article", "title": "h2", "link": "a"}}'),
  ('Eagle News', 'https://eagle.mn', 'MN', 'mn', 'html', '{"selectors": {"article": ".post", "title": ".entry-title", "link": "a"}}'),
  ('Ikon.mn', 'https://ikon.mn', 'MN', 'mn', 'html', '{"selectors": {"article": ".article-item", "title": ".title", "link": "a"}}'),
  ('Gogo.mn', 'https://gogo.mn', 'MN', 'mn', 'html', '{"selectors": {"article": ".news-card", "title": ".headline", "link": "a"}}'),

  -- Global Sources (RSS)
  ('BBC News', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'GB', 'en', 'rss', '{}'),
  ('Reuters', 'https://www.reutersagency.com/feed/', 'US', 'en', 'rss', '{}'),
  ('AP News', 'https://feedx.net/rss/ap.xml', 'US', 'en', 'rss', '{}'),
  ('The Guardian', 'https://www.theguardian.com/world/rss', 'GB', 'en', 'rss', '{}'),
  ('Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml', 'QA', 'en', 'rss', '{}')
ON CONFLICT DO NOTHING;
