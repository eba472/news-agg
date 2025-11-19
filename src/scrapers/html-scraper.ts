import * as cheerio from 'cheerio';
import { BaseScraper } from './base-scraper';
import { ScrapedArticle, NewsSource } from '../types';

export class HtmlScraper extends BaseScraper {
  constructor(source: NewsSource) {
    super(source);
  }

  async scrape(): Promise<ScrapedArticle[]> {
    this.logger.info(`Scraping HTML from ${this.source.url}`);

    try {
      const response = await this.fetchWithRetry(this.source.url);
      const html = await response.text();
      const $ = cheerio.load(html);

      const articles: ScrapedArticle[] = [];
      const config = this.source.scraper_config || {};
      const selectors = config.selectors || {};

      // Generic scraping - try common patterns
      const articleElements = this.findArticleElements($, selectors);

      for (const element of articleElements) {
        try {
          const article = this.extractArticleData($, element, selectors);
          if (article && article.url && article.title) {
            articles.push(article);
          }
        } catch (error) {
          this.logger.debug('Failed to extract article:', error);
        }
      }

      this.logger.success(`Scraped ${articles.length} articles from ${this.source.name}`);
      return articles.slice(0, 20); // Limit to 20 latest articles
    } catch (error) {
      this.logger.error(`Failed to scrape ${this.source.name}:`, error);
      return [];
    }
  }

  private findArticleElements($: cheerio.CheerioAPI, selectors: any): cheerio.Element[] {
    const possibleSelectors = [
      selectors.article,
      'article',
      '.article',
      '.news-item',
      '.post',
      '.entry',
      '.story',
      '[class*="article"]',
      '[class*="news"]',
      '[class*="post"]',
    ];

    for (const selector of possibleSelectors) {
      if (!selector) continue;
      const elements = $(selector).toArray();
      if (elements.length > 0) {
        this.logger.debug(`Found ${elements.length} articles using selector: ${selector}`);
        return elements;
      }
    }

    return [];
  }

  private extractArticleData(
    $: cheerio.CheerioAPI,
    element: cheerio.Element,
    selectors: any
  ): ScrapedArticle | null {
    const $el = $(element);

    // Extract title
    const titleSelectors = [selectors.title, 'h1', 'h2', 'h3', '.title', '.headline', 'a'];
    const title = this.extractText($, $el, titleSelectors);
    if (!title) return null;

    // Extract URL
    const linkSelectors = [selectors.link, 'a', 'a[href]'];
    const url = this.extractUrl($, $el, linkSelectors);
    if (!url) return null;

    // Extract image
    const imageSelectors = [selectors.image, 'img', 'img[src]', '[class*="image"] img'];
    const image_url = this.extractImageUrl($, $el, imageSelectors);

    // Extract date
    const dateSelectors = [selectors.date, 'time', '.date', '.published', '[datetime]'];
    const published_at = this.extractDate($, $el, dateSelectors);

    // Extract content preview
    const contentSelectors = [selectors.content, '.excerpt', '.summary', 'p'];
    const content = this.extractText($, $el, contentSelectors);

    return {
      title: this.cleanText(title),
      url: this.normalizeUrl(url, this.source.url),
      content: content ? this.cleanText(content) : undefined,
      published_at: published_at || new Date(),
      image_url: image_url ? this.normalizeUrl(image_url, this.source.url) : undefined,
    };
  }

  private extractText($: cheerio.CheerioAPI, $el: cheerio.Cheerio, selectors: string[]): string {
    for (const selector of selectors) {
      if (!selector) continue;
      const text = $el.find(selector).first().text().trim();
      if (text) return text;
    }
    return '';
  }

  private extractUrl($: cheerio.CheerioAPI, $el: cheerio.Cheerio, selectors: string[]): string {
    for (const selector of selectors) {
      if (!selector) continue;
      const href = $el.find(selector).first().attr('href');
      if (href) return href;
    }
    // Check element itself
    const href = $el.attr('href');
    return href || '';
  }

  private extractImageUrl($: cheerio.CheerioAPI, $el: cheerio.Cheerio, selectors: string[]): string {
    for (const selector of selectors) {
      if (!selector) continue;
      const src = $el.find(selector).first().attr('src');
      if (src) return src;
    }
    return '';
  }

  private extractDate($: cheerio.CheerioAPI, $el: cheerio.Cheerio, selectors: string[]): Date | undefined {
    for (const selector of selectors) {
      if (!selector) continue;
      const dateStr = $el.find(selector).first().attr('datetime') || $el.find(selector).first().text();
      if (dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;
      }
    }
    return undefined;
  }
}
