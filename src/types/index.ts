export interface NewsSource {
  id: number;
  name: string;
  url: string;
  country: string;
  language: string;
  scraper_type: 'rss' | 'html' | 'api';
  scraper_config: any;
  is_active: boolean;
}

export interface Article {
  id?: number;
  source_id: number;
  title: string;
  title_en?: string;
  url: string;
  content?: string;
  summary?: string;
  author?: string;
  published_at?: Date;
  scraped_at?: Date;
  image_url?: string;
  language: string;
  importance_score?: number;
  importance_reason?: string;
}

export interface ScrapedArticle {
  title: string;
  url: string;
  content?: string;
  author?: string;
  published_at?: Date;
  image_url?: string;
}

export interface Category {
  id: number;
  name: string;
  name_mn?: string;
  name_en?: string;
}

export interface Newsletter {
  id?: number;
  subject: string;
  sent_at?: Date;
  status: 'draft' | 'sent' | 'failed';
  substack_post_id?: string;
  recipient_count?: number;
}

export interface Subscriber {
  id?: number;
  email: string;
  name?: string;
  language_preference: 'en' | 'mn' | 'both';
  is_active: boolean;
  verified: boolean;
  verification_token?: string;
  unsubscribe_token?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface SubscriberCategory {
  subscriber_id: number;
  category_id: number;
  priority: number; // 1-5, where 1 is highest
}

export interface ArticleImportanceScore {
  score: number; // 0.0 to 1.0
  reason: string;
}
