# Pre-Release Checklist

Complete this checklist before launching your Mongolian News Aggregator to production.

## ✅ Database Setup

- [ ] **PostgreSQL database created**
  - Using Neon.tech or Supabase
  - At least 500MB available
  - Connection string saved securely

- [ ] **Database migrations run successfully**
  ```bash
  npm run db:migrate
  ```

- [ ] **Verify all tables created**
  ```sql
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public';
  ```
  Should see: `news_sources`, `articles`, `categories`, `article_categories`, `newsletters`, `newsletter_articles`, `subscribers`, `subscriber_categories`

- [ ] **Check default data inserted**
  ```sql
  SELECT COUNT(*) FROM categories;  -- Should be 10
  SELECT COUNT(*) FROM news_sources WHERE is_active = true;  -- Should be 10
  ```

## ✅ API Keys & Configuration

- [ ] **Gemini AI API Key** (REQUIRED)
  - Get from: https://makersuite.google.com/app/apikey
  - Free tier: 60 requests per minute
  - Add to `.env`: `GEMINI_API_KEY=your_key_here`
  - Test it works: https://aistudio.google.com/

- [ ] **Database URL configured**
  - Format: `postgresql://user:pass@host:port/db`
  - Test connection works

- [ ] **Base URL set** (for production)
  - Add to `.env`: `BASE_URL=https://your-domain.com`
  - Used for email verification and unsubscribe links

- [ ] **Optional: Substack/Email API**
  - For automated email sending
  - Not required for initial launch

## ✅ Testing Locally

- [ ] **Install dependencies**
  ```bash
  npm install
  ```

- [ ] **Build successfully**
  ```bash
  npm run build
  ```
  No TypeScript errors

- [ ] **Test scraping**
  ```bash
  npm run scrape
  ```
  - Scrapes at least 50+ articles
  - No critical errors
  - Check logs for success messages

- [ ] **Test Gemini scoring**
  - Check database: `SELECT COUNT(*) FROM articles WHERE importance_score IS NOT NULL;`
  - Should see scored articles after scraping
  - Scores should be between 0.0 and 1.0

- [ ] **Test newsletter generation**
  ```bash
  npm run send-newsletter
  ```
  - Newsletter HTML generated in `newsletters/` folder
  - Check HTML renders properly in browser
  - Contains articles from last 24 hours

- [ ] **Test API server**
  ```bash
  npm run dev
  ```
  Then test endpoints:
  - `curl http://localhost:8080/health` → healthy
  - `curl http://localhost:8080/api/articles` → returns articles
  - `curl http://localhost:8080/api/categories` → returns 10 categories
  - `curl http://localhost:8080/api/stats` → returns statistics

- [ ] **Test subscriber management**
  ```bash
  # Subscribe
  curl -X POST http://localhost:8080/api/subscribe \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "name": "Test User",
      "categoryIds": [1, 2, 3],
      "languagePreference": "en"
    }'
  ```
  - Subscriber created
  - Verification token generated
  - Categories linked

- [ ] **Test personalized newsletters**
  - Create test subscriber with preferences
  - Run newsletter generation
  - Verify personalized content matches preferences

## ✅ GitHub Actions Setup

- [ ] **Repository pushed to GitHub**
  ```bash
  git push origin main
  ```

- [ ] **GitHub Secrets configured**
  Go to Settings > Secrets and variables > Actions, add:
  - `DATABASE_URL` - Your PostgreSQL connection string
  - `GEMINI_API_KEY` - Your Gemini AI API key
  - `BASE_URL` - Your production domain (optional)
  - `NEWSLETTER_FROM_NAME` - Your newsletter name (optional)

- [ ] **Workflows enabled**
  - Go to Actions tab
  - Enable workflows if prompted

- [ ] **Test manual workflow run**
  - Actions > Daily News Scraping > Run workflow
  - Wait for completion (5-10 minutes)
  - Check logs for errors
  - Verify articles added to database

- [ ] **Schedule configured correctly**
  - Daily scraping: 6 AM UTC (check timezone)
  - Newsletter: 7 AM UTC
  - Adjust cron expressions if needed

## ✅ Production Deployment (Optional)

### If using Google Cloud Run:

- [ ] **Docker image builds**
  ```bash
  docker build -t news-aggregator .
  ```

- [ ] **Environment variables set**
  - All `.env` variables configured in Cloud Run

- [ ] **Deploy successfully**
  ```bash
  gcloud run deploy news-aggregator \
    --image gcr.io/PROJECT_ID/news-aggregator \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated
  ```

- [ ] **Health check works**
  - Visit `https://your-service-url/health`

- [ ] **Cloud Scheduler configured** (if not using GitHub Actions)
  - Daily scraping job created
  - Newsletter job created

## ✅ Content Quality

- [ ] **News sources accessible**
  - All 10 sources reachable
  - Scrapers working for each
  - No 403 Forbidden or blocking issues

- [ ] **Article classification working**
  - Articles tagged with categories
  - Categories make sense
  - Confidence scores reasonable

- [ ] **Gemini scoring reasonable**
  - Important articles score high (>0.7)
  - Less important articles score lower
  - Reasons provided make sense

- [ ] **Newsletter looks good**
  - HTML renders properly
  - Images load
  - Links work
  - Mobile responsive
  - Unsubscribe link works

## ✅ Subscriber Management

- [ ] **Subscription flow tested**
  - User can subscribe
  - Email validation works
  - 3-5 category requirement enforced
  - Verification token generated

- [ ] **Verification works**
  - Clicking verification link activates account
  - Invalid tokens rejected

- [ ] **Unsubscribe works**
  - Unsubscribe link deactivates account
  - User removed from mailing list

- [ ] **Preferences update works**
  - User can change category preferences
  - Changes reflected in next newsletter

## ✅ Monitoring & Logs

- [ ] **Logging configured**
  - Logs are readable
  - Errors clearly marked
  - Timestamps present

- [ ] **Error handling**
  - Scraping failures don't crash system
  - Failed articles logged but skipped
  - Gemini API failures fall back to heuristics

- [ ] **Stats tracking**
  - Can query article counts
  - Newsletter sent count accurate
  - Subscriber stats correct

## ✅ Performance

- [ ] **Scraping completes in reasonable time**
  - All 10 sources < 10 minutes total
  - Rate limiting respected
  - No timeouts

- [ ] **Gemini scoring efficient**
  - Batch processing works
  - Rate limits not exceeded
  - Fallback scoring for failures

- [ ] **Newsletter generation fast**
  - Personalized newsletters < 30 seconds per subscriber
  - Database queries optimized

- [ ] **API response times good**
  - `/api/articles` < 500ms
  - `/api/stats` < 200ms

## ✅ Security

- [ ] **Environment variables secure**
  - `.env` not committed to git
  - Secrets in GitHub Actions only
  - API keys rotatable

- [ ] **Database access restricted**
  - SSL enabled
  - IP whitelist if applicable
  - Connection pooling configured

- [ ] **Input validation**
  - Email validation on subscribe
  - Category count enforced (3-5)
  - SQL injection prevented (using parameterized queries)

- [ ] **Unsubscribe tokens secure**
  - UUID v4 (cryptographically random)
  - Unique per subscriber
  - One-time use verification tokens

## ✅ Documentation

- [ ] **README.md up to date**
  - Installation instructions clear
  - API endpoints documented
  - Examples provided

- [ ] **SETUP_GUIDE.md complete**
  - Step-by-step instructions
  - Troubleshooting section
  - Screenshots if helpful

- [ ] **Code comments**
  - Complex logic explained
  - API functions documented
  - Configuration options described

## ✅ Final Checks

- [ ] **Free tier limits understood**
  - GitHub Actions: 2000 min/month (using ~30)
  - Neon DB: 512MB (using ~100MB)
  - Gemini: 60 RPM (using ~10 RPM)
  - No unexpected costs

- [ ] **Backup strategy**
  - Database backups configured (Neon/Supabase auto-backup)
  - Newsletter archives saved
  - Code in version control

- [ ] **Support plan**
  - Know how to check logs
  - Know how to restart services
  - Know how to fix common issues

- [ ] **Launch communication ready**
  - Landing page (optional)
  - Social media announcement (optional)
  - Initial subscriber list (if any)

## 🚀 Launch!

Once all items are checked:

1. **Do final test**
   ```bash
   npm run scrape
   npm run send-newsletter
   ```

2. **Verify everything works**

3. **Enable GitHub Actions workflows**

4. **Monitor for 24 hours**
   - Check Actions runs
   - Verify articles scraped
   - Check newsletter generated
   - Monitor for errors

5. **Start collecting subscribers!**

## Post-Launch

- [ ] Monitor daily for first week
- [ ] Check subscriber engagement
- [ ] Review article quality
- [ ] Adjust scrapers if needed
- [ ] Gather feedback
- [ ] Plan improvements

---

## Common Issues & Solutions

### Scraping fails
- Check news source URLs still valid
- Verify selectors in database
- Check rate limiting
- Review scraper logs

### Gemini API errors
- Check API key valid
- Verify rate limits not exceeded
- Check quota remaining
- Fallback scoring should still work

### Newsletter empty
- Verify articles scraped in last 24 hours
- Check database has articles
- Verify classification ran
- Check SQL queries

### Subscribers not receiving emails
- Email sending not implemented yet (save to file)
- Need to integrate Resend/Brevo for actual sending
- Verify subscriber verified = true

---

**Ready to launch?** Make sure ALL critical items (Database, API Keys, Testing) are checked!
