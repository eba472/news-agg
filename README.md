# Mongolian News Aggregator

A comprehensive news aggregation system that scrapes top Mongolian and global news sources, classifies articles, and generates daily newsletters via Substack.

## Features

- **Multi-source Scraping**: Scrapes from 5 Mongolian and 5 global news sources
- **Smart Classification**: Automatically categorizes articles into 10+ categories
- **Daily Newsletters**: Generates beautiful HTML newsletters
- **Free Tier Architecture**: Built entirely with free-tier services
- **Automated Scheduling**: GitHub Actions for daily automation
- **REST API**: Query articles by language, category, or date
- **Docker Support**: Easy deployment to Google Cloud Run

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│         GitHub Actions (Free - 2000 min/month)          │
│              Triggers daily at 6 AM UTC                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              TypeScript Backend                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Scraper    │  │  Classifier  │  │  Newsletter  │  │
│  │   Service    │  │   Service    │  │   Generator  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────┬────────────────┬────────────────┬──────────────┘
         │                │                │
         ▼                ▼                ▼
    News Sites      PostgreSQL         Substack
                  (Neon/Supabase)
```

## Tech Stack

- **Backend**: TypeScript, Node.js 18+
- **Database**: PostgreSQL (Neon or Supabase free tier)
- **Scraping**: Cheerio, RSS Parser
- **Scheduling**: GitHub Actions (free)
- **Deployment**: Google Cloud Run (optional)
- **Newsletter**: Substack API

## News Sources

### Mongolian Sources
1. News.mn
2. Montsame
3. Eagle News
4. Ikon.mn
5. Gogo.mn

### Global Sources (RSS)
1. BBC News
2. Reuters
3. AP News
4. The Guardian
5. Al Jazeera

## Installation

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon or Supabase free tier)
- GitHub account (for automated scraping)

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd news-agg
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your credentials:
   ```env
   # Get from Neon.tech or Supabase
   DATABASE_URL=postgresql://user:password@host:5432/news_aggregator

   # Optional: For newsletter sending
   SUBSTACK_API_KEY=your_key
   SUBSTACK_PUBLICATION_URL=https://yourpublication.substack.com

   # Optional: For better classification
   OPENAI_API_KEY=your_openai_key

   NODE_ENV=development
   PORT=8080
   ```

4. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

5. **Build the project**
   ```bash
   npm run build
   ```

## Usage

### Manual Scraping

```bash
# Scrape all news sources
npm run scrape

# Generate and send newsletter
npm run send-newsletter
```

### Start API Server

```bash
# Development
npm run dev

# Production
npm start
```

The server will run on `http://localhost:8080`

### API Endpoints

- `GET /health` - Health check
- `GET /api/articles?limit=50&language=mn` - Get recent articles
- `GET /api/articles/category/Technology` - Get articles by category
- `GET /api/stats` - Get statistics

### Example API Usage

```bash
# Get latest 20 Mongolian articles
curl http://localhost:8080/api/articles?limit=20&language=mn

# Get Technology news
curl http://localhost:8080/api/articles/category/Technology

# Get statistics
curl http://localhost:8080/api/stats
```

## Automated Scheduling with GitHub Actions

This project includes GitHub Actions workflows that run automatically:

### Setup GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Add the following secrets:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `SUBSTACK_API_KEY` - Your Substack API key (optional)
   - `SUBSTACK_PUBLICATION_URL` - Your Substack URL (optional)
   - `NEWSLETTER_FROM_NAME` - Newsletter sender name (optional)
   - `NEWSLETTER_SUBJECT_PREFIX` - Newsletter subject prefix (optional)

### Workflows

1. **Daily News Scraping** (`.github/workflows/daily-news-scrape.yml`)
   - Runs every day at 6 AM UTC (2 PM Mongolia Time)
   - Scrapes all news sources
   - Saves articles to database
   - Manual trigger available

2. **Send Newsletter** (`.github/workflows/send-newsletter.yml`)
   - Runs every day at 7 AM UTC (3 PM Mongolia Time)
   - Generates newsletter from scraped articles
   - Saves HTML to artifacts
   - Manual trigger available

### Manual Trigger

You can manually trigger workflows from the Actions tab in GitHub.

## Deployment to Google Cloud Run

### Prerequisites

- Google Cloud account
- gcloud CLI installed

### Deploy

1. **Build and push Docker image**
   ```bash
   # Set your project ID
   export PROJECT_ID=your-gcp-project-id

   # Build image
   docker build -t gcr.io/$PROJECT_ID/news-aggregator .

   # Push to Google Container Registry
   docker push gcr.io/$PROJECT_ID/news-aggregator
   ```

2. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy news-aggregator \
     --image gcr.io/$PROJECT_ID/news-aggregator \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars DATABASE_URL=$DATABASE_URL
   ```

3. **Set up Cloud Scheduler (optional)**
   ```bash
   # Create daily scraping job
   gcloud scheduler jobs create http daily-scrape \
     --schedule="0 6 * * *" \
     --uri="https://your-service-url/scrape" \
     --http-method=POST
   ```

## Free Tier Limits

| Service | Free Tier | Monthly Usage |
|---------|-----------|---------------|
| GitHub Actions | 2000 min/month | ~30 min/month ✅ |
| Neon PostgreSQL | 512 MB | ~100 MB ✅ |
| Supabase PostgreSQL | 500 MB | ~100 MB ✅ |
| Google Cloud Run | 2M requests | ~1K requests ✅ |

**Total Monthly Cost: $0** 🎉

## Database Schema

- `news_sources` - News source configurations
- `articles` - Scraped articles
- `categories` - Article categories
- `article_categories` - Article-category relationships
- `newsletters` - Newsletter records
- `newsletter_articles` - Newsletter content

## Project Structure

```
news-agg/
├── src/
│   ├── database/
│   │   ├── schema.sql          # Database schema
│   │   ├── db.ts               # Database connection
│   │   └── migrate.ts          # Migration script
│   ├── scrapers/
│   │   ├── base-scraper.ts     # Base scraper class
│   │   ├── rss-scraper.ts      # RSS feed scraper
│   │   ├── html-scraper.ts     # HTML scraper
│   │   └── scraper-factory.ts  # Scraper factory
│   ├── processors/
│   │   ├── classifier.ts       # Article classifier
│   │   └── article-processor.ts # Article processing
│   ├── newsletter/
│   │   ├── template.ts         # HTML templates
│   │   ├── generator.ts        # Newsletter generator
│   │   └── substack-client.ts  # Substack integration
│   ├── jobs/
│   │   ├── daily-scrape.ts     # Scraping job
│   │   └── send-newsletter.ts  # Newsletter job
│   ├── utils/
│   │   ├── logger.ts           # Logging utility
│   │   └── config.ts           # Configuration
│   └── index.ts                # API server
├── .github/
│   └── workflows/
│       ├── daily-news-scrape.yml
│       └── send-newsletter.yml
├── Dockerfile
├── package.json
└── README.md
```

## Article Categories

The system automatically classifies articles into:

- Politics (Улс төр)
- Business (Бизнес)
- Technology (Технологи)
- Sports (Спорт)
- Entertainment (Үзвэр наадам)
- Health (Эрүүл мэнд)
- Science (Шинжлэх ухаан)
- Economy (Эдийн засаг)
- World (Дэлхий)
- Local (Дотоод)

## Newsletter Format

The newsletter includes:

- **Mongolian News Section** - Top 10 stories from Mongolian sources
- **Global News Section** - Top 10 international stories
- **Category Sections** - Articles grouped by category
- Beautiful HTML formatting with images
- Source attribution and timestamps

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
psql $DATABASE_URL

# Check if tables exist
npm run db:migrate
```

### Scraping Failures

- Check if news source URLs are still valid
- Verify internet connectivity
- Review scraper logs in GitHub Actions artifacts

### Newsletter Not Sending

- Verify Substack API credentials
- Check newsletter HTML in `newsletters/` directory
- Review logs for error messages

## Development

### Running Tests

```bash
npm test
```

### Local Development

```bash
# Start in development mode with auto-reload
npm run dev

# Run scraper once
npm run scrape

# Generate newsletter
npm run send-newsletter
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for your own news aggregation needs!

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the troubleshooting section

## Roadmap

- [ ] Add more Mongolian news sources
- [ ] Implement translation API for cross-language support
- [ ] Add sentiment analysis
- [ ] Create web dashboard
- [ ] Support multiple newsletter templates
- [ ] Add RSS feed output
- [ ] Implement caching layer
- [ ] Add article deduplication across sources

## Acknowledgments

- Built with TypeScript and Node.js
- Uses free tier services from Neon, GitHub, and Google Cloud
- Inspired by the need for aggregated Mongolian news

---

**Made with ❤️ for the Mongolian community**
