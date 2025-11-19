import Parser from 'rss-parser';
import { BaseScraper } from './base-scraper';
import { ScrapedArticle, NewsSource } from '../types';

export class RssScraper extends BaseScraper {
  private parser: Parser;

  constructor(source: NewsSource) {
    super(source);
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)',
      },
    });
  }

  async scrape(): Promise<ScrapedArticle[]> {
    this.logger.info(`Scraping RSS feed from ${this.source.url}`);

    try {
      const feed = await this.parser.parseURL(this.source.url);
      const articles: ScrapedArticle[] = [];

      for (const item of feed.items) {
        if (!item.link || !item.title) continue;

        const article: ScrapedArticle = {
          title: this.cleanText(item.title),
          url: item.link,
          content: item.contentSnippet || item.content || '',
          author: item.creator || item.author || undefined,
          published_at: item.pubDate ? new Date(item.pubDate) : new Date(),
          image_url: this.extractImageUrl(item),
        };

        articles.push(article);
      }

      this.logger.success(`Scraped ${articles.length} articles from ${this.source.name}`);
      return articles;
    } catch (error) {
      this.logger.error(`Failed to scrape ${this.source.name}:`, error);
      return [];
    }
  }

  private extractImageUrl(item: any): string | undefined {
    // Try various RSS image fields
    if (item.enclosure && item.enclosure.url) {
      return item.enclosure.url;
    }
    if (item['media:content'] && item['media:content'].url) {
      return item['media:content'].url;
    }
    if (item['media:thumbnail'] && item['media:thumbnail'].url) {
      return item['media:thumbnail'].url;
    }
    // Try to extract from content
    if (item.content) {
      const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
      if (imgMatch) {
        return imgMatch[1];
      }
    }
    return undefined;
  }
}
