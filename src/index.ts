import express from 'express';
import { config } from './utils/config';
import { Logger } from './utils/logger';
import { query } from './database/db';

const logger = new Logger('Server');
const app = express();

app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: 'Database connection failed' });
  }
});

// API endpoint to get recent articles
app.get('/api/articles', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const language = req.query.language as string;

    const languageFilter = language ? 'WHERE a.language = $1' : '';
    const params = language ? [language, limit] : [limit];
    const limitParam = language ? '$2' : '$1';

    const result = await query(
      `SELECT
        a.id, a.title, a.url, a.summary, a.author,
        a.published_at, a.image_url, a.language,
        ns.name as source_name
      FROM articles a
      JOIN news_sources ns ON a.source_id = ns.id
      ${languageFilter}
      ORDER BY a.published_at DESC
      LIMIT ${limitParam}`,
      params
    );

    res.json({ articles: result.rows, count: result.rows.length });
  } catch (error) {
    logger.error('Failed to fetch articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// API endpoint to get articles by category
app.get('/api/articles/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await query(
      `SELECT
        a.id, a.title, a.url, a.summary, a.author,
        a.published_at, a.image_url, a.language,
        ns.name as source_name
      FROM articles a
      JOIN news_sources ns ON a.source_id = ns.id
      JOIN article_categories ac ON a.id = ac.article_id
      JOIN categories c ON ac.category_id = c.id
      WHERE c.name = $1
      ORDER BY a.published_at DESC
      LIMIT $2`,
      [category, limit]
    );

    res.json({ category, articles: result.rows, count: result.rows.length });
  } catch (error) {
    logger.error('Failed to fetch articles by category:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// API endpoint to get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM articles) as total_articles,
        (SELECT COUNT(*) FROM news_sources WHERE is_active = true) as active_sources,
        (SELECT COUNT(*) FROM newsletters WHERE status = 'sent') as newsletters_sent,
        (SELECT COUNT(*) FROM articles WHERE scraped_at > NOW() - INTERVAL '24 hours') as articles_today
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    logger.error('Failed to fetch stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Start server
const PORT = config.app.port;
app.listen(PORT, () => {
  logger.success(`Server running on port ${PORT}`);
  logger.info(`Environment: ${config.app.env}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

export default app;
