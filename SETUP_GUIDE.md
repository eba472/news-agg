# Complete Setup Guide

This guide will walk you through setting up the Mongolian News Aggregator from scratch.

## Step 1: Set Up PostgreSQL Database

### Option A: Using Neon (Recommended)

1. Go to [neon.tech](https://neon.tech)
2. Sign up for a free account
3. Create a new project called "news-aggregator"
4. Copy the connection string (looks like: `postgresql://user:pass@host/db`)
5. Save this for later - you'll need it for the `DATABASE_URL`

### Option B: Using Supabase

1. Go to [supabase.com](https://supabase.com)
2. Sign up for a free account
3. Create a new project
4. Go to Settings > Database
5. Copy the connection string (URI format)
6. Save this for later

## Step 2: Set Up the Project Locally

1. **Clone and install**
   ```bash
   cd news-agg
   npm install
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```

3. **Edit .env file**
   ```bash
   nano .env  # or use your preferred editor
   ```

   Add your database URL:
   ```env
   DATABASE_URL=postgresql://user:pass@host/db
   NODE_ENV=development
   PORT=8080
   ```

4. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

   You should see:
   ```
   ✅ Database migration completed successfully!
   ```

5. **Build the project**
   ```bash
   npm run build
   ```

## Step 3: Test Locally

1. **Test scraping**
   ```bash
   npm run scrape
   ```

   You should see output like:
   ```
   [2024-01-XX] INFO: Starting daily news scraping job...
   [2024-01-XX] INFO: Found 10 active news sources
   [2024-01-XX] INFO: Scraping BBC News...
   [2024-01-XX] SUCCESS: Scraped 20 articles from BBC News
   ...
   ```

2. **Test newsletter generation**
   ```bash
   npm run send-newsletter
   ```

   Newsletter HTML will be saved in `newsletters/` directory.

3. **Test API server**
   ```bash
   npm run dev
   ```

   Visit http://localhost:8080/health in your browser.
   You should see: `{"status":"healthy",...}`

## Step 4: Set Up GitHub Actions (Automated Scraping)

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Add GitHub Secrets**

   Go to your GitHub repository:
   - Click Settings
   - Click Secrets and variables > Actions
   - Click "New repository secret"

   Add these secrets:
   - Name: `DATABASE_URL`
     Value: Your PostgreSQL connection string

   Optional secrets:
   - `SUBSTACK_API_KEY` - If you have Substack API access
   - `SUBSTACK_PUBLICATION_URL` - Your Substack URL
   - `NEWSLETTER_FROM_NAME` - E.g., "Mongolian News Digest"
   - `NEWSLETTER_SUBJECT_PREFIX` - E.g., "Daily Digest"

3. **Enable GitHub Actions**

   - Go to the Actions tab in your repository
   - Enable workflows if prompted
   - You should see two workflows:
     - "Daily News Scraping"
     - "Send Daily Newsletter"

4. **Test the workflows**

   - Go to Actions tab
   - Click "Daily News Scraping"
   - Click "Run workflow" > "Run workflow"
   - Wait for it to complete
   - Check the logs

## Step 5: Set Up Substack (Newsletter Distribution)

### Option 1: Manual Posting

1. After running `npm run send-newsletter`
2. Open the generated HTML file in `newsletters/`
3. Copy the HTML content
4. Go to your Substack dashboard
5. Create a new post
6. Paste the HTML
7. Publish

### Option 2: Email API (Alternative)

Since Substack doesn't have a public API, you can use email APIs:

1. **Using Resend (100 emails/day free)**
   ```bash
   npm install resend
   ```

   Update `src/newsletter/substack-client.ts`:
   ```typescript
   import { Resend } from 'resend';

   const resend = new Resend(process.env.RESEND_API_KEY);

   await resend.emails.send({
     from: 'newsletter@yourdomain.com',
     to: 'your-subscribers@example.com',
     subject: subject,
     html: htmlContent,
   });
   ```

2. **Using Brevo (300 emails/day free)**
   - Sign up at [brevo.com](https://brevo.com)
   - Get API key
   - Use their Node.js SDK

## Step 6: Deploy to Google Cloud Run (Optional)

### Prerequisites

Install Google Cloud CLI:
```bash
# macOS
brew install google-cloud-sdk

# Linux
curl https://sdk.cloud.google.com | bash

# Windows
# Download from https://cloud.google.com/sdk/docs/install
```

### Deployment Steps

1. **Initialize gcloud**
   ```bash
   gcloud init
   gcloud auth login
   ```

2. **Set project**
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **Enable required APIs**
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   ```

4. **Build and push Docker image**
   ```bash
   # Build
   docker build -t gcr.io/YOUR_PROJECT_ID/news-aggregator .

   # Configure Docker for GCR
   gcloud auth configure-docker

   # Push
   docker push gcr.io/YOUR_PROJECT_ID/news-aggregator
   ```

5. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy news-aggregator \
     --image gcr.io/YOUR_PROJECT_ID/news-aggregator \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars DATABASE_URL="YOUR_DATABASE_URL" \
     --memory 512Mi \
     --timeout 300
   ```

6. **Get the service URL**
   ```bash
   gcloud run services describe news-aggregator \
     --platform managed \
     --region us-central1 \
     --format 'value(status.url)'
   ```

## Step 7: Schedule with Cloud Scheduler (Optional)

If using Cloud Run instead of GitHub Actions:

```bash
# Enable Cloud Scheduler
gcloud services enable cloudscheduler.googleapis.com

# Create scraping job (runs daily at 6 AM UTC)
gcloud scheduler jobs create http daily-news-scrape \
  --schedule="0 6 * * *" \
  --uri="https://YOUR_SERVICE_URL/scrape" \
  --http-method=POST \
  --oidc-service-account-email=YOUR_SERVICE_ACCOUNT

# Create newsletter job (runs daily at 7 AM UTC)
gcloud scheduler jobs create http daily-newsletter \
  --schedule="0 7 * * *" \
  --uri="https://YOUR_SERVICE_URL/newsletter" \
  --http-method=POST \
  --oidc-service-account-email=YOUR_SERVICE_ACCOUNT
```

## Verification Checklist

- [ ] Database is accessible and migrated
- [ ] Local scraping works (`npm run scrape`)
- [ ] Local newsletter generation works (`npm run send-newsletter`)
- [ ] API server starts without errors (`npm run dev`)
- [ ] GitHub Actions workflows are enabled
- [ ] GitHub secrets are configured
- [ ] Test workflow run completes successfully
- [ ] Newsletter HTML is generated correctly
- [ ] (Optional) Cloud Run deployment is live
- [ ] (Optional) Cloud Scheduler jobs are created

## Monitoring

### Check GitHub Actions

1. Go to Actions tab
2. View recent workflow runs
3. Download artifacts (logs, newsletters)

### Check Database

```bash
# Connect to database
psql $DATABASE_URL

# Check article count
SELECT COUNT(*) FROM articles;

# Check recent articles
SELECT title, source_id, published_at
FROM articles
ORDER BY published_at DESC
LIMIT 10;

# Check newsletter stats
SELECT * FROM newsletters ORDER BY created_at DESC;
```

### Check Logs

```bash
# Local logs
npm run scrape 2>&1 | tee scrape.log

# Cloud Run logs
gcloud run logs read news-aggregator \
  --platform managed \
  --region us-central1 \
  --limit 100
```

## Troubleshooting

### "Database connection failed"

- Verify `DATABASE_URL` is correct
- Check if database server is accessible
- Ensure IP is whitelisted (Neon/Supabase)

### "No articles scraped"

- Check internet connectivity
- Verify news source URLs are still valid
- Check if websites have changed their structure
- Review scraper logs for errors

### "GitHub Actions failing"

- Check if secrets are set correctly
- Verify workflow file syntax
- Review action logs for specific errors
- Ensure dependencies install correctly

### "Newsletter not generating"

- Ensure articles exist in database
- Check if articles are from last 24 hours
- Verify newsletter templates are correct
- Review generator logs

## Next Steps

1. **Customize news sources** - Edit `src/database/schema.sql`
2. **Adjust scraping schedule** - Edit `.github/workflows/daily-news-scrape.yml`
3. **Customize newsletter template** - Edit `src/newsletter/template.ts`
4. **Add more categories** - Update `src/processors/classifier.ts`
5. **Set up monitoring** - Add Sentry, LogRocket, etc.

## Getting Help

- Review README.md for general information
- Check GitHub Issues for common problems
- Review logs for specific error messages
- Test each component individually

---

**Setup complete!** Your news aggregator should now be running automatically every day.
