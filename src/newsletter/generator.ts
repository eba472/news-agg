import { query } from '../database/db';
import { Logger } from '../utils/logger';
import { ArticleProcessor } from '../processors/article-processor';
import { NewsletterTemplate } from './template';
import { SubstackClient } from './substack-client';
import { config } from '../utils/config';

export class NewsletterGenerator {
  private logger: Logger;
  private processor: ArticleProcessor;
  private substackClient: SubstackClient;

  constructor() {
    this.logger = new Logger('NewsletterGenerator');
    this.processor = new ArticleProcessor();
    this.substackClient = new SubstackClient();
  }

  async generateAndSend(): Promise<boolean> {
    this.logger.info('Starting newsletter generation...');

    try {
      // Get articles from last 24 hours
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24);

      // Get Mongolian news (limit to top 10)
      const mongolianNews = await this.processor.getRecentArticles(10, 'mn');
      this.logger.info(`Found ${mongolianNews.length} Mongolian articles`);

      // Get Global news (limit to top 10)
      const globalNews = await this.processor.getRecentArticles(10, 'en');
      this.logger.info(`Found ${globalNews.length} Global articles`);

      if (mongolianNews.length === 0 && globalNews.length === 0) {
        this.logger.warn('No articles found for newsletter');
        return false;
      }

      // Get top articles by category (5 per category, max 5 categories)
      const topCategories: Record<string, any[]> = {};
      const categories = ['Politics', 'Business', 'Technology', 'Sports', 'Health'];

      for (const category of categories) {
        const articles = await this.processor.getTopArticlesByCategory(category, 5);
        if (articles.length > 0) {
          topCategories[category] = articles;
        }
      }

      // Generate newsletter content
      const newsletterData = {
        date: new Date(),
        mongolianNews: mongolianNews.slice(0, 10),
        globalNews: globalNews.slice(0, 10),
        topCategories,
      };

      const htmlContent = NewsletterTemplate.generateHtml(newsletterData);
      const plainText = NewsletterTemplate.generatePlainText(newsletterData);

      // Create subject
      const subject = `${config.newsletter.subjectPrefix} - ${new Date().toLocaleDateString()}`;

      // Save newsletter record
      const newsletterId = await this.saveNewsletterRecord(subject, mongolianNews, globalNews);

      // Publish to Substack (or save draft)
      const result = await this.substackClient.createDraft(subject, htmlContent);

      if (result) {
        // Update newsletter status
        await query(
          'UPDATE newsletters SET status = $1, sent_at = $2 WHERE id = $3',
          ['sent', new Date(), newsletterId]
        );

        this.logger.success('Newsletter generated and saved successfully!');
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to generate newsletter:', error);
      return false;
    }
  }

  private async saveNewsletterRecord(
    subject: string,
    mongolianArticles: any[],
    globalArticles: any[]
  ): Promise<number> {
    // Create newsletter record
    const result = await query(
      'INSERT INTO newsletters (subject, status) VALUES ($1, $2) RETURNING id',
      [subject, 'draft']
    );

    const newsletterId = result.rows[0].id;

    // Link articles to newsletter
    const allArticles = [...mongolianArticles, ...globalArticles];
    for (let i = 0; i < allArticles.length; i++) {
      await query(
        'INSERT INTO newsletter_articles (newsletter_id, article_id, position) VALUES ($1, $2, $3)',
        [newsletterId, allArticles[i].id, i]
      );
    }

    return newsletterId;
  }

  async getNewsletterStats(): Promise<any> {
    const result = await query(`
      SELECT
        COUNT(*) as total_newsletters,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
        MAX(sent_at) as last_sent
      FROM newsletters
    `);

    return result.rows[0];
  }
}
