import { ScrapedArticle, NewsSource } from '../types';
import { Logger } from '../utils/logger';

export abstract class BaseScraper {
  protected logger: Logger;
  protected source: NewsSource;

  constructor(source: NewsSource) {
    this.source = source;
    this.logger = new Logger(`Scraper:${source.name}`);
  }

  abstract scrape(): Promise<ScrapedArticle[]>;

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected normalizeUrl(url: string, baseUrl: string): string {
    if (url.startsWith('http')) {
      return url;
    }
    if (url.startsWith('/')) {
      const base = new URL(baseUrl);
      return `${base.protocol}//${base.host}${url}`;
    }
    return `${baseUrl}/${url}`;
  }

  protected cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
  }

  protected async fetchWithRetry(
    url: string,
    retries: number = 3,
    delay: number = 1000
  ): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)',
          },
        });

        if (response.ok) {
          return response;
        }

        if (response.status === 429 || response.status >= 500) {
          this.logger.warn(`Request failed with status ${response.status}, retrying...`);
          await this.delay(delay * Math.pow(2, i));
          continue;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        if (i === retries - 1) throw error;
        this.logger.warn(`Fetch attempt ${i + 1} failed, retrying...`);
        await this.delay(delay * Math.pow(2, i));
      }
    }

    throw new Error('Max retries exceeded');
  }
}
