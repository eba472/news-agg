import { NewsSource } from '../types';
import { BaseScraper } from './base-scraper';
import { RssScraper } from './rss-scraper';
import { HtmlScraper } from './html-scraper';

export class ScraperFactory {
  static createScraper(source: NewsSource): BaseScraper {
    switch (source.scraper_type) {
      case 'rss':
        return new RssScraper(source);
      case 'html':
        return new HtmlScraper(source);
      case 'api':
        // Future: implement API scrapers
        throw new Error(`API scraper not implemented yet for ${source.name}`);
      default:
        throw new Error(`Unknown scraper type: ${source.scraper_type}`);
    }
  }
}
