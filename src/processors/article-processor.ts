import { query } from '../database/db';
import { Article } from '../types';
import { ArticleClassifier } from './classifier';
import { GeminiScorer } from './gemini-scorer';
import { Logger } from '../utils/logger';

export class ArticleProcessor {
  private logger: Logger;
  private classifier: ArticleClassifier;
  private geminiScorer: GeminiScorer;

  constructor() {
    this.logger = new Logger('ArticleProcessor');
    this.classifier = new ArticleClassifier();
    this.geminiScorer = new GeminiScorer();
  }

  async saveArticle(article: Article): Promise<number | null> {
    try {
      // Check if article already exists
      const existingArticle = await query(
        'SELECT id FROM articles WHERE url = $1',
        [article.url]
      );

      if (existingArticle.rows.length > 0) {
        this.logger.debug(`Article already exists: ${article.url}`);
        return existingArticle.rows[0].id;
      }

      // Generate summary if not provided
      const summary = article.summary || this.classifier.generateSummary(article);

      // Insert article
      const result = await query(
        `INSERT INTO articles
        (source_id, title, title_en, url, content, summary, author, published_at, image_url, language, importance_score, importance_reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          article.source_id,
          article.title,
          article.title_en || null,
          article.url,
          article.content || null,
          summary,
          article.author || null,
          article.published_at || new Date(),
          article.image_url || null,
          article.language,
          article.importance_score || null,
          article.importance_reason || null,
        ]
      );

      const articleId = result.rows[0].id;
      this.logger.success(`Saved article: ${article.title.substring(0, 50)}... (ID: ${articleId})`);

      // Classify and tag article
      await this.classifyAndTag(articleId, article);

      return articleId;
    } catch (error) {
      this.logger.error('Failed to save article:', error);
      return null;
    }
  }

  private async classifyAndTag(articleId: number, article: Article): Promise<void> {
    try {
      const categories = this.classifier.classifyArticle(article);

      for (const { category, confidence } of categories) {
        // Get category ID
        const categoryResult = await query(
          'SELECT id FROM categories WHERE name = $1',
          [category]
        );

        if (categoryResult.rows.length === 0) {
          this.logger.warn(`Category not found: ${category}`);
          continue;
        }

        const categoryId = categoryResult.rows[0].id;

        // Insert article-category relationship
        await query(
          `INSERT INTO article_categories (article_id, category_id, confidence_score)
           VALUES ($1, $2, $3)
           ON CONFLICT (article_id, category_id) DO NOTHING`,
          [articleId, categoryId, confidence]
        );
      }

      this.logger.debug(`Tagged article ${articleId} with ${categories.length} categories`);
    } catch (error) {
      this.logger.error('Failed to classify and tag article:', error);
    }
  }

  async processArticles(articles: Article[]): Promise<number> {
    let savedCount = 0;

    for (const article of articles) {
      const articleId = await this.saveArticle(article);
      if (articleId) {
        savedCount++;
      }
    }

    this.logger.success(`Processed ${savedCount}/${articles.length} articles`);
    return savedCount;
  }

  async scoreArticlesWithGemini(articleIds?: number[]): Promise<void> {
    try {
      let articles: any[];

      if (articleIds && articleIds.length > 0) {
        // Score specific articles
        const placeholders = articleIds.map((_, i) => `$${i + 1}`).join(',');
        const result = await query(
          `SELECT * FROM articles WHERE id IN (${placeholders}) AND importance_score IS NULL`,
          articleIds
        );
        articles = result.rows;
      } else {
        // Score all unscored articles from the last 24 hours
        const result = await query(
          `SELECT * FROM articles
           WHERE importance_score IS NULL
           AND scraped_at > NOW() - INTERVAL '24 hours'
           ORDER BY scraped_at DESC`
        );
        articles = result.rows;
      }

      if (articles.length === 0) {
        this.logger.info('No articles to score');
        return;
      }

      this.logger.info(`Scoring ${articles.length} articles with Gemini...`);

      const scores = await this.geminiScorer.scoreBatch(articles);

      // Update articles with scores
      for (const [articleId, scoreData] of scores.entries()) {
        await query(
          `UPDATE articles
           SET importance_score = $1, importance_reason = $2
           WHERE id = $3`,
          [scoreData.score, scoreData.reason, articleId]
        );
      }

      this.logger.success(`Scored ${scores.size} articles successfully`);
    } catch (error) {
      this.logger.error('Failed to score articles with Gemini:', error);
    }
  }

  async getRecentArticles(limit: number = 50, language?: string): Promise<any[]> {
    try {
      const languageFilter = language ? 'WHERE a.language = $1' : '';
      const params = language ? [language, limit] : [limit];
      const limitParam = language ? '$2' : '$1';

      const result = await query(
        `SELECT
          a.id, a.title, a.title_en, a.url, a.summary, a.author,
          a.published_at, a.image_url, a.language,
          ns.name as source_name,
          array_agg(c.name) as categories
        FROM articles a
        JOIN news_sources ns ON a.source_id = ns.id
        LEFT JOIN article_categories ac ON a.id = ac.article_id
        LEFT JOIN categories c ON ac.category_id = c.id
        ${languageFilter}
        GROUP BY a.id, ns.name
        ORDER BY a.published_at DESC
        LIMIT ${limitParam}`,
        params
      );

      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get recent articles:', error);
      return [];
    }
  }

  async getTopArticlesByCategory(category: string, limit: number = 10): Promise<any[]> {
    try {
      const result = await query(
        `SELECT
          a.id, a.title, a.title_en, a.url, a.summary, a.author,
          a.published_at, a.image_url, a.language,
          ns.name as source_name
        FROM articles a
        JOIN news_sources ns ON a.source_id = ns.id
        JOIN article_categories ac ON a.id = ac.article_id
        JOIN categories c ON ac.category_id = c.id
        WHERE c.name = $1
        ORDER BY a.published_at DESC, ac.confidence_score DESC
        LIMIT $2`,
        [category, limit]
      );

      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get articles by category:', error);
      return [];
    }
  }
}
