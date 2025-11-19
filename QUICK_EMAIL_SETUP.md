# Quick Email Setup Guide

Get email sending working in 15 minutes using Resend (recommended).

## Why Resend?

- **Best free tier:** 100 emails/day (vs 10/day for SendGrid)
- **Excellent deliverability:** Built by ex-Vercel team
- **Simple API:** 3 lines of code
- **Great docs:** Easy to follow

## Step 1: Sign Up (2 minutes)

1. Go to https://resend.com/signup
2. Sign up with GitHub or email
3. Verify your email

## Step 2: Get API Key (1 minute)

1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Name it "Production" or "News Aggregator"
4. Copy the key (starts with `re_...`)
5. Add to `.env`:
   ```
   RESEND_API_KEY=re_your_key_here
   ```

## Step 3: Verify Your Domain (5 minutes)

**Option A: Use Resend's Free Domain (Testing Only)**
- Emails will be from `onboarding@resend.dev`
- Good for testing, not for production
- Skip to Step 4

**Option B: Use Your Own Domain (Recommended)**

1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Add these DNS records to your domain provider:

```
# SPF Record
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all

# DKIM Records (Resend will give you 3 records)
Type: TXT
Name: resend._domainkey
Value: [copy from Resend dashboard]

Type: TXT
Name: resend2._domainkey
Value: [copy from Resend dashboard]

Type: TXT
Name: resend3._domainkey
Value: [copy from Resend dashboard]
```

5. Wait 5-10 minutes for DNS propagation
6. Click "Verify Domain" in Resend dashboard

**DNS Providers:**
- **Cloudflare:** DNS → Records → Add Record
- **GoDaddy:** My Products → DNS → Manage DNS
- **Namecheap:** Domain List → Manage → Advanced DNS

## Step 4: Install Resend (1 minute)

```bash
cd /home/user/news-agg
npm install resend
```

## Step 5: Create Email Sender (5 minutes)

Create new file:

```bash
touch src/newsletter/email-sender.ts
```

Add this code:

```typescript
// src/newsletter/email-sender.ts
import { Resend } from 'resend';
import { Logger } from '../utils/logger';
import { config } from '../utils/config';

export class EmailSender {
  private logger: Logger;
  private resend: Resend;
  private fromEmail: string;

  constructor() {
    this.logger = new Logger('EmailSender');
    this.resend = new Resend(process.env.RESEND_API_KEY);

    // Use your verified domain or Resend's default
    this.fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
  }

  async sendNewsletter(
    to: string,
    subject: string,
    html: string,
    unsubscribeUrl: string
  ): Promise<boolean> {
    try {
      const result = await this.resend.emails.send({
        from: `${config.newsletter.fromName} <${this.fromEmail}>`,
        to: [to],
        subject: subject,
        html: html,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
        },
      });

      if (result.data) {
        this.logger.success(`Email sent to ${to}: ${result.data.id}`);
        return true;
      }

      this.logger.error(`Failed to send email to ${to}:`, result.error);
      return false;
    } catch (error) {
      this.logger.error(`Error sending email to ${to}:`, error);
      return false;
    }
  }

  async sendVerificationEmail(
    to: string,
    name: string,
    verificationUrl: string
  ): Promise<boolean> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to Mongolian News Digest! 🎉</h1>
    <p>Hi ${name || 'there'},</p>
    <p>Thanks for subscribing! Please verify your email address to start receiving your personalized news digest.</p>
    <a href="${verificationUrl}" class="button">Verify Email Address</a>
    <p>Or copy this link: ${verificationUrl}</p>
    <div class="footer">
      <p>If you didn't sign up for this newsletter, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendNewsletter(
      to,
      'Verify your email - Mongolian News Digest',
      html,
      `${config.newsletter.baseUrl}/api/unsubscribe/temp`
    );
  }

  async sendWelcomeEmail(
    to: string,
    name: string,
    categories: string[]
  ): Promise<boolean> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .category-badge {
      display: inline-block;
      padding: 5px 10px;
      background: #e9ecef;
      border-radius: 3px;
      margin: 5px;
      font-size: 14px;
    }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>You're All Set! 🎉</h1>
    <p>Hi ${name || 'there'},</p>
    <p>Your email is verified! You'll start receiving your personalized news digest daily.</p>

    <h2>Your Selected Categories:</h2>
    <div>
      ${categories.map(cat => `<span class="category-badge">${cat}</span>`).join('')}
    </div>

    <p><strong>What to expect:</strong></p>
    <ul>
      <li>📰 Daily digest of top news from your categories</li>
      <li>🤖 AI-ranked articles by importance</li>
      <li>🌍 Mix of Mongolian and international news</li>
      <li>🔗 Direct links to original sources</li>
    </ul>

    <p>Your first newsletter arrives tomorrow!</p>

    <div class="footer">
      <p>Want to change your preferences? <a href="${config.newsletter.baseUrl}">Update here</a></p>
      <p>Not interested anymore? <a href="${config.newsletter.baseUrl}/api/unsubscribe/temp">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendNewsletter(
      to,
      'Welcome to your personalized news digest!',
      html,
      `${config.newsletter.baseUrl}/api/unsubscribe/temp`
    );
  }
}
```

## Step 6: Update Newsletter Generator (3 minutes)

Update `src/newsletter/generator.ts`:

```typescript
import { EmailSender } from './email-sender';

export class NewsletterGenerator {
  private emailSender: EmailSender;

  constructor() {
    // ... existing code ...
    this.emailSender = new EmailSender();
  }

  private async generatePersonalizedNewsletter(subscriber: any): Promise<boolean> {
    // ... existing code to generate htmlContent ...

    // Replace this line:
    // await this.substackClient.createDraft(`${subject}_${subscriber.email}`, htmlContent);

    // With actual email sending:
    const unsubscribeUrl = `${config.newsletter.baseUrl}/api/unsubscribe/${subscriber.unsubscribe_token}`;
    const success = await this.emailSender.sendNewsletter(
      subscriber.email,
      subject,
      htmlContent,
      unsubscribeUrl
    );

    if (success) {
      this.logger.success(`Newsletter sent to ${subscriber.email}`);
    }

    // Still save to file as backup
    await this.substackClient.createDraft(`${subject}_${subscriber.email}`, htmlContent);

    return success;
  }
}
```

## Step 7: Update Subscriber Service (2 minutes)

Update `src/services/subscriber-service.ts`:

```typescript
import { EmailSender } from '../newsletter/email-sender';

export class SubscriberService {
  private emailSender: EmailSender;

  constructor() {
    this.logger = new Logger('SubscriberService');
    this.emailSender = new EmailSender();
  }

  async createSubscriber(
    email: string,
    name: string | undefined,
    categoryIds: number[],
    languagePreference: 'en' | 'mn' | 'both' = 'en'
  ): Promise<Subscriber | null> {
    // ... existing code ...

    const subscriber = result.rows[0];

    // Send verification email
    const verificationUrl = `${process.env.BASE_URL}/api/verify/${subscriber.verification_token}`;
    await this.emailSender.sendVerificationEmail(
      email,
      name || 'Reader',
      verificationUrl
    );

    return subscriber;
  }

  async verifySubscriber(verificationToken: string): Promise<boolean> {
    try {
      const result = await query(
        `UPDATE subscribers
         SET verified = true, verification_token = NULL
         WHERE verification_token = $1 AND verified = false
         RETURNING id, email, name`,
        [verificationToken]
      );

      if (result.rows.length > 0) {
        const subscriber = result.rows[0];

        // Get categories
        const categoriesResult = await query(
          `SELECT c.name FROM categories c
           JOIN subscriber_categories sc ON c.id = sc.category_id
           WHERE sc.subscriber_id = $1`,
          [subscriber.id]
        );
        const categories = categoriesResult.rows.map(r => r.name);

        // Send welcome email
        await this.emailSender.sendWelcomeEmail(
          subscriber.email,
          subscriber.name,
          categories
        );

        this.logger.success(`Subscriber verified: ${subscriber.id}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to verify subscriber:', error);
      return false;
    }
  }
}
```

## Step 8: Update .env (1 minute)

Add to your `.env`:

```env
# Resend Email Configuration
RESEND_API_KEY=re_your_key_here
FROM_EMAIL=news@yourdomain.com  # or onboarding@resend.dev for testing
BASE_URL=http://localhost:8080  # Change to your production domain later
```

## Step 9: Update package.json (30 seconds)

Add to dependencies in `package.json`:

```json
{
  "dependencies": {
    "resend": "^3.0.0"
  }
}
```

Then run:

```bash
npm install
```

## Step 10: Test It! (5 minutes)

### Test 1: Verification Email

```bash
# Start server
npm run dev

# Subscribe (use your real email)
curl -X POST http://localhost:8080/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your.email@example.com",
    "name": "Your Name",
    "categoryIds": [1, 2, 3],
    "languagePreference": "en"
  }'
```

**Expected:** You receive verification email in 1-2 minutes

### Test 2: Newsletter Sending

```bash
# Generate and send newsletters
npm run send-newsletter
```

**Expected:** Emails sent to all verified subscribers

### Test 3: Check Logs

```bash
# Look for success messages
[EmailSender] ✅: Email sent to user@example.com: abc123
```

## Troubleshooting

### Error: "Invalid API key"
- Check `.env` has correct `RESEND_API_KEY`
- Verify key starts with `re_`
- Check key wasn't truncated

### Error: "From address not verified"
- If using custom domain, verify DNS records in Resend dashboard
- For testing, use `onboarding@resend.dev`

### Emails not arriving
- Check spam folder
- Verify email address is correct
- Check Resend dashboard → Logs for delivery status
- If using Gmail, check "Promotions" tab

### DNS records not propagating
- Wait 10-15 minutes
- Check with: `dig TXT yourdomain.com`
- Use Resend's "Check DNS" button

## Production Checklist

Before going live:

- [ ] Domain verified in Resend
- [ ] All 4 DNS records added (SPF + 3x DKIM)
- [ ] `FROM_EMAIL` in `.env` uses your domain
- [ ] `BASE_URL` points to production domain
- [ ] Test email to multiple providers (Gmail, Outlook, Yahoo)
- [ ] Check spam score at https://www.mail-tester.com/
- [ ] Unsubscribe link tested
- [ ] Welcome email tested

## Rate Limits

**Resend Free Tier:**
- 100 emails per day
- 3,000 emails per month
- Rate limit: 2 emails/second

**Tips:**
- Start slow to warm up domain
- Batch send with delays
- Upgrade to paid if you hit limits ($20/month = 50K emails)

## Monitoring

Check email delivery:

```bash
# Resend dashboard
https://resend.com/emails

# Shows:
- Delivered count
- Bounced emails
- Spam complaints
- Click/open rates (if tracking enabled)
```

## Next Steps

1. **Add email tracking** (opens, clicks)
2. **Handle bounces** (mark subscribers inactive)
3. **A/B test subject lines**
4. **Warm up domain** (send slowly for first 2 weeks)
5. **Monitor deliverability** (aim for >95%)

## Upgrade Path

When you exceed 100 emails/day:

1. **Resend Pro** - $20/month for 50,000 emails
2. **Resend Business** - $80/month for 500,000 emails

Or switch to:
- **Brevo** - 300/day free, then $25/month for 20K emails
- **SendGrid** - $15/month for 40K emails (after 100/day free)

---

**Total Time:** ~15 minutes
**Cost:** $0 (free tier)
**Result:** Production-ready email sending! 🎉
