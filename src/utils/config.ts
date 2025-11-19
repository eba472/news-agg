import dotenv from 'dotenv';

dotenv.config();

export const config = {
  database: {
    url: process.env.DATABASE_URL || '',
  },
  substack: {
    apiKey: process.env.SUBSTACK_API_KEY || '',
    publicationUrl: process.env.SUBSTACK_PUBLICATION_URL || '',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  newsletter: {
    fromName: process.env.NEWSLETTER_FROM_NAME || 'Mongolian News Digest',
    subjectPrefix: process.env.NEWSLETTER_SUBJECT_PREFIX || 'Daily News Digest',
  },
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '8080'),
  },
};

export default config;
