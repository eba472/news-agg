import { query } from '../database/db';
import { Logger } from '../utils/logger';
import { Subscriber, SubscriberCategory } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class SubscriberService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('SubscriberService');
  }

  async createSubscriber(
    email: string,
    name: string | undefined,
    categoryIds: number[],
    languagePreference: 'en' | 'mn' | 'both' = 'en'
  ): Promise<Subscriber | null> {
    // Validate category count (3-5 categories)
    if (categoryIds.length < 3 || categoryIds.length > 5) {
      this.logger.error('Subscriber must select between 3 and 5 categories');
      return null;
    }

    try {
      // Check if email already exists
      const existingResult = await query('SELECT id FROM subscribers WHERE email = $1', [email]);
      if (existingResult.rows.length > 0) {
        this.logger.warn(`Email already subscribed: ${email}`);
        return null;
      }

      // Generate tokens
      const verificationToken = uuidv4();
      const unsubscribeToken = uuidv4();

      // Create subscriber
      const result = await query(
        `INSERT INTO subscribers
        (email, name, language_preference, verification_token, unsubscribe_token)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [email, name, languagePreference, verificationToken, unsubscribeToken]
      );

      const subscriber = result.rows[0];

      // Add category preferences with priority
      for (let i = 0; i < categoryIds.length; i++) {
        await query(
          `INSERT INTO subscriber_categories (subscriber_id, category_id, priority)
           VALUES ($1, $2, $3)`,
          [subscriber.id, categoryIds[i], i + 1] // Priority 1-5
        );
      }

      this.logger.success(`New subscriber created: ${email}`);
      return subscriber;
    } catch (error) {
      this.logger.error('Failed to create subscriber:', error);
      return null;
    }
  }

  async verifySubscriber(verificationToken: string): Promise<boolean> {
    try {
      const result = await query(
        `UPDATE subscribers
         SET verified = true, verification_token = NULL
         WHERE verification_token = $1 AND verified = false
         RETURNING id`,
        [verificationToken]
      );

      if (result.rows.length > 0) {
        this.logger.success(`Subscriber verified: ${result.rows[0].id}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to verify subscriber:', error);
      return false;
    }
  }

  async unsubscribe(unsubscribeToken: string): Promise<boolean> {
    try {
      const result = await query(
        `UPDATE subscribers
         SET is_active = false
         WHERE unsubscribe_token = $1
         RETURNING id`,
        [unsubscribeToken]
      );

      if (result.rows.length > 0) {
        this.logger.success(`Subscriber unsubscribed: ${result.rows[0].id}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to unsubscribe:', error);
      return false;
    }
  }

  async updateCategoryPreferences(
    subscriberId: number,
    categoryIds: number[]
  ): Promise<boolean> {
    // Validate category count (3-5 categories)
    if (categoryIds.length < 3 || categoryIds.length > 5) {
      this.logger.error('Subscriber must select between 3 and 5 categories');
      return false;
    }

    try {
      // Remove existing preferences
      await query('DELETE FROM subscriber_categories WHERE subscriber_id = $1', [subscriberId]);

      // Add new preferences
      for (let i = 0; i < categoryIds.length; i++) {
        await query(
          `INSERT INTO subscriber_categories (subscriber_id, category_id, priority)
           VALUES ($1, $2, $3)`,
          [subscriberId, categoryIds[i], i + 1]
        );
      }

      this.logger.success(`Updated category preferences for subscriber ${subscriberId}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to update category preferences:', error);
      return false;
    }
  }

  async getActiveSubscribers(): Promise<any[]> {
    try {
      const result = await query(
        `SELECT
          s.id, s.email, s.name, s.language_preference, s.unsubscribe_token,
          array_agg(
            json_build_object(
              'category_id', sc.category_id,
              'category_name', c.name,
              'priority', sc.priority
            ) ORDER BY sc.priority
          ) as categories
        FROM subscribers s
        LEFT JOIN subscriber_categories sc ON s.id = sc.subscriber_id
        LEFT JOIN categories c ON sc.category_id = c.id
        WHERE s.is_active = true AND s.verified = true
        GROUP BY s.id
        ORDER BY s.created_at DESC`
      );

      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get active subscribers:', error);
      return [];
    }
  }

  async getSubscriberById(id: number): Promise<any | null> {
    try {
      const result = await query(
        `SELECT
          s.id, s.email, s.name, s.language_preference, s.is_active, s.verified,
          s.unsubscribe_token, s.created_at,
          array_agg(
            json_build_object(
              'category_id', sc.category_id,
              'category_name', c.name,
              'priority', sc.priority
            ) ORDER BY sc.priority
          ) as categories
        FROM subscribers s
        LEFT JOIN subscriber_categories sc ON s.id = sc.subscriber_id
        LEFT JOIN categories c ON sc.category_id = c.id
        WHERE s.id = $1
        GROUP BY s.id`,
        [id]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      this.logger.error('Failed to get subscriber:', error);
      return null;
    }
  }

  async getSubscriberStats(): Promise<any> {
    try {
      const result = await query(`
        SELECT
          COUNT(*) as total_subscribers,
          COUNT(CASE WHEN verified = true THEN 1 END) as verified_count,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_count,
          COUNT(CASE WHEN language_preference = 'mn' THEN 1 END) as mongolian_pref,
          COUNT(CASE WHEN language_preference = 'en' THEN 1 END) as english_pref,
          COUNT(CASE WHEN language_preference = 'both' THEN 1 END) as both_pref
        FROM subscribers
      `);

      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to get subscriber stats:', error);
      return null;
    }
  }

  async getCategoryPopularity(): Promise<any[]> {
    try {
      const result = await query(`
        SELECT
          c.name,
          c.name_mn,
          COUNT(sc.subscriber_id) as subscriber_count,
          ROUND(AVG(sc.priority), 2) as avg_priority
        FROM categories c
        LEFT JOIN subscriber_categories sc ON c.id = sc.category_id
        GROUP BY c.id, c.name, c.name_mn
        ORDER BY subscriber_count DESC
      `);

      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get category popularity:', error);
      return [];
    }
  }
}
