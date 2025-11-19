import { query } from '../database/db';
import { ScraperFactory } from '../scrapers/scraper-factory';
import { ArticleProcessor } from '../processors/article-processor';
import { Logger } from '../utils/logger';
import { NewsSource, Article } from '../types';

const logger = new Logger('DailyScrape');

async function runDailyScrape() {
  logger.info('========================================');
  logger.info('Starting daily news scraping job...');
  logger.info('========================================');

  const startTime = Date.now();
  let totalArticlesScraped = 0;
  let totalArticlesSaved = 0;

  try {
    // Get all active news sources
    const sourcesResult = await query(
      'SELECT * FROM news_sources WHERE is_active = true ORDER BY id'
    );

    const sources: NewsSource[] = sourcesResult.rows;
    logger.info(`Found ${sources.length} active news sources`);

    const processor = new ArticleProcessor();

    // Scrape each source
    for (const source of sources) {
      try {
        logger.info(`\n--- Scraping ${source.name} (${source.country}) ---`);

        const scraper = ScraperFactory.createScraper(source);
        const scrapedArticles = await scraper.scrape();

        logger.info(`Scraped ${scrapedArticles.length} articles from ${source.name}`);
        totalArticlesScraped += scrapedArticles.length;

        // Convert scraped articles to Article objects
        const articles: Article[] = scrapedArticles.map(scraped => ({
          source_id: source.id,
          title: scraped.title,
          url: scraped.url,
          content: scraped.content,
          author: scraped.author,
          published_at: scraped.published_at,
          image_url: scraped.image_url,
          language: source.language,
        }));

        // Process and save articles
        const savedCount = await processor.processArticles(articles);
        totalArticlesSaved += savedCount;

        // Add delay between sources to be respectful
        await delay(2000);
      } catch (error) {
        logger.error(`Failed to scrape ${source.name}:`, error);
        // Continue with next source
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info('\n========================================');
    logger.success('Daily scraping job completed!');
    logger.info(`Total articles scraped: ${totalArticlesScraped}`);
    logger.info(`Total articles saved: ${totalArticlesSaved}`);
    logger.info(`Duration: ${duration}s`);
    logger.info('========================================');

    process.exit(0);
  } catch (error) {
    logger.error('Daily scrape job failed:', error);
    process.exit(1);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the job
runDailyScrape();
