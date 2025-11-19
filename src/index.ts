import express from 'express';
import { config } from './utils/config';
import { Logger } from './utils/logger';
import { query } from './database/db';
import { SubscriberService } from './services/subscriber-service';

const logger = new Logger('Server');
const app = express();
const subscriberService = new SubscriberService();

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

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const result = await query('SELECT id, name, name_mn, name_en FROM categories ORDER BY name');
    res.json({ categories: result.rows });
  } catch (error) {
    logger.error('Failed to fetch categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Subscribe endpoint
app.post('/api/subscribe', async (req, res) => {
  try {
    const { email, name, categoryIds, languagePreference } = req.body;

    if (!email || !categoryIds || !Array.isArray(categoryIds)) {
      return res.status(400).json({ error: 'Email and categoryIds are required' });
    }

    if (categoryIds.length < 3 || categoryIds.length > 5) {
      return res.status(400).json({ error: 'Please select between 3 and 5 categories' });
    }

    const subscriber = await subscriberService.createSubscriber(
      email,
      name,
      categoryIds,
      languagePreference || 'en'
    );

    if (!subscriber) {
      return res.status(400).json({ error: 'Failed to create subscription. Email may already exist.' });
    }

    // Send verification email (in production)
    const verificationUrl = `${config.newsletter.baseUrl}/api/verify/${subscriber.verification_token}`;

    res.json({
      message: 'Subscription created! Please check your email to verify.',
      subscriber: {
        id: subscriber.id,
        email: subscriber.email,
        verificationUrl, // In production, send via email instead
      },
    });
  } catch (error) {
    logger.error('Failed to create subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Verify subscription
app.get('/api/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const success = await subscriberService.verifySubscriber(token);

    if (success) {
      res.send('<h1>✅ Email Verified!</h1><p>Thank you for subscribing to the Mongolian News Digest.</p>');
    } else {
      res.status(400).send('<h1>❌ Invalid or expired verification link</h1>');
    }
  } catch (error) {
    logger.error('Failed to verify subscriber:', error);
    res.status(500).send('<h1>❌ Verification failed</h1>');
  }
});

// Unsubscribe endpoint
app.get('/api/unsubscribe/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const success = await subscriberService.unsubscribe(token);

    if (success) {
      res.send('<h1>Unsubscribed Successfully</h1><p>You have been removed from our mailing list.</p>');
    } else {
      res.status(400).send('<h1>Invalid unsubscribe link</h1>');
    }
  } catch (error) {
    logger.error('Failed to unsubscribe:', error);
    res.status(500).send('<h1>Unsubscribe failed</h1>');
  }
});

// Update subscriber preferences
app.put('/api/subscribers/:id/preferences', async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryIds } = req.body;

    if (!categoryIds || !Array.isArray(categoryIds)) {
      return res.status(400).json({ error: 'categoryIds array is required' });
    }

    const success = await subscriberService.updateCategoryPreferences(parseInt(id), categoryIds);

    if (success) {
      res.json({ message: 'Preferences updated successfully' });
    } else {
      res.status(400).json({ error: 'Failed to update preferences' });
    }
  } catch (error) {
    logger.error('Failed to update preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Get subscriber stats
app.get('/api/subscribers/stats', async (req, res) => {
  try {
    const stats = await subscriberService.getSubscriberStats();
    const popularity = await subscriberService.getCategoryPopularity();

    res.json({
      stats,
      categoryPopularity: popularity,
    });
  } catch (error) {
    logger.error('Failed to fetch subscriber stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
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
