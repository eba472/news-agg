import { NewsletterGenerator } from '../newsletter/generator';
import { Logger } from '../utils/logger';

const logger = new Logger('SendNewsletter');

async function runNewsletterJob() {
  logger.info('========================================');
  logger.info('Starting newsletter generation job...');
  logger.info('========================================');

  try {
    const generator = new NewsletterGenerator();

    // Generate and send newsletter
    const success = await generator.generateAndSend();

    if (success) {
      logger.success('Newsletter generated and sent successfully!');

      // Get stats
      const stats = await generator.getNewsletterStats();
      logger.info('Newsletter Statistics:');
      logger.info(`  Total newsletters: ${stats.total_newsletters}`);
      logger.info(`  Sent: ${stats.sent_count}`);
      logger.info(`  Last sent: ${stats.last_sent || 'Never'}`);
    } else {
      logger.warn('Newsletter generation completed with warnings');
    }

    logger.info('========================================');
    process.exit(0);
  } catch (error) {
    logger.error('Newsletter job failed:', error);
    process.exit(1);
  }
}

// Run the job
runNewsletterJob();
