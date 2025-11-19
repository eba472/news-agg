import { query } from '../database/db';
import { Logger } from '../utils/logger';
import { ArticleProcessor } from '../processors/article-processor';
import { NewsletterTemplate } from './template';
import { SubstackClient } from './substack-client';
import { SubscriberService } from '../services/subscriber-service';
import { config } from '../utils/config';

export class NewsletterGenerator {
  private logger: Logger;
  private processor: ArticleProcessor;
  private substackClient: SubstackClient;
  private subscriberService: SubscriberService;

  constructor() {
    this.logger = new Logger('NewsletterGenerator');
    this.processor = new ArticleProcessor();
    this.substackClient = new SubstackClient();
    this.subscriberService = new SubscriberService();
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

  async generatePersonalizedNewsletters(): Promise<number> {
    this.logger.info('Generating personalized newsletters for subscribers...');

    try {
      const subscribers = await this.subscriberService.getActiveSubscribers();
      this.logger.info(`Found ${subscribers.length} active subscribers`);

      let successCount = 0;

      for (const subscriber of subscribers) {
        try {
          const success = await this.generatePersonalizedNewsletter(subscriber);
          if (success) {
            successCount++;
          }
        } catch (error) {
          this.logger.error(`Failed to generate newsletter for ${subscriber.email}:`, error);
        }
      }

      this.logger.success(`Generated ${successCount}/${subscribers.length} personalized newsletters`);
      return successCount;
    } catch (error) {
      this.logger.error('Failed to generate personalized newsletters:', error);
      return 0;
    }
  }

  private async generatePersonalizedNewsletter(subscriber: any): Promise<boolean> {
    try {
      // Get subscriber's preferred categories
      const categoryIds = subscriber.categories
        .filter((c: any) => c.category_id)
        .map((c: any) => c.category_id);

      if (categoryIds.length === 0) {
        this.logger.warn(`No categories for subscriber ${subscriber.email}`);
        return false;
      }

      // Get top articles for each of the subscriber's categories
      // Prioritize by importance_score
      const placeholders = categoryIds.map((_: any, i: number) => `$${i + 1}`).join(',');

      const articlesResult = await query(
        `SELECT
          a.id, a.title, a.title_en, a.url, a.summary, a.author,
          a.published_at, a.image_url, a.language, a.importance_score, a.importance_reason,
          ns.name as source_name,
          c.name as category_name,
          ac.confidence_score
        FROM articles a
        JOIN news_sources ns ON a.source_id = ns.id
        JOIN article_categories ac ON a.id = ac.article_id
        JOIN categories c ON ac.category_id = c.id
        WHERE c.id IN (${placeholders})
          AND a.published_at > NOW() - INTERVAL '24 hours'
          AND (
            (a.language = $${categoryIds.length + 1}) OR
            ($${categoryIds.length + 1} = 'both')
          )
        ORDER BY
          COALESCE(a.importance_score, 0.5) DESC,
          a.published_at DESC
        LIMIT 20`,
        [...categoryIds, subscriber.language_preference]
      );

      const articles = articlesResult.rows;

      if (articles.length === 0) {
        this.logger.warn(`No articles found for subscriber ${subscriber.email}`);
        return false;
      }

      // Group articles by category
      const articlesByCategory: Record<string, any[]> = {};
      for (const article of articles) {
        if (!articlesByCategory[article.category_name]) {
          articlesByCategory[article.category_name] = [];
        }
        if (articlesByCategory[article.category_name].length < 5) {
          articlesByCategory[article.category_name].push(article);
        }
      }

      // Generate newsletter
      const newsletterData = {
        date: new Date(),
        subscriber,
        mongolianNews: articles.filter((a: any) => a.language === 'mn').slice(0, 10),
        globalNews: articles.filter((a: any) => a.language === 'en').slice(0, 10),
        topCategories: articlesByCategory,
      };

      const htmlContent = NewsletterTemplate.generatePersonalizedHtml(newsletterData);
      const subject = `${config.newsletter.subjectPrefix} - ${new Date().toLocaleDateString()} - Personalized for You`;

      // In production, send email here
      this.logger.info(`Generated personalized newsletter for ${subscriber.email}`);

      // Save to file for now
      await this.substackClient.createDraft(`${subject}_${subscriber.email}`, htmlContent);

      return true;
    } catch (error) {
      this.logger.error(`Failed to generate personalized newsletter:`, error);
      return false;
    }
  }

  async getTopArticlesByImportance(limit: number = 20): Promise<any[]> {
    try {
      const result = await query(
        `SELECT
          a.id, a.title, a.url, a.summary, a.importance_score, a.importance_reason,
          a.published_at, a.image_url, a.language,
          ns.name as source_name,
          array_agg(c.name) as categories
        FROM articles a
        JOIN news_sources ns ON a.source_id = ns.id
        LEFT JOIN article_categories ac ON a.id = ac.article_id
        LEFT JOIN categories c ON ac.category_id = c.id
        WHERE a.published_at > NOW() - INTERVAL '24 hours'
          AND a.importance_score IS NOT NULL
        GROUP BY a.id, ns.name
        ORDER BY a.importance_score DESC, a.published_at DESC
        LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get top articles by importance:', error);
      return [];
    }
  }
}
