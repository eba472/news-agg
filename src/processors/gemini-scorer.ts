import { GoogleGenerativeAI } from '@google/generative-ai';
import { Logger } from '../utils/logger';
import { Article, ArticleImportanceScore } from '../types';
import { config } from '../utils/config';

export class GeminiScorer {
  private logger: Logger;
  private genAI: GoogleGenerativeAI | null;
  private model: any;

  constructor() {
    this.logger = new Logger('GeminiScorer');

    if (config.gemini.apiKey) {
      this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    } else {
      this.genAI = null;
      this.logger.warn('Gemini API key not configured. Article scoring will be disabled.');
    }
  }

  async scoreArticle(article: Article): Promise<ArticleImportanceScore> {
    if (!this.genAI || !this.model) {
      // Fallback to simple scoring if Gemini not available
      return this.fallbackScoring(article);
    }

    try {
      const prompt = this.buildScoringPrompt(article);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseGeminiResponse(text);
    } catch (error) {
      this.logger.error(`Failed to score article with Gemini: ${article.title}`, error);
      return this.fallbackScoring(article);
    }
  }

  async scoreBatch(articles: Article[]): Promise<Map<number, ArticleImportanceScore>> {
    const scores = new Map<number, ArticleImportanceScore>();

    // Process in batches of 5 to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);

      const promises = batch.map(async (article) => {
        const score = await this.scoreArticle(article);
        if (article.id) {
          scores.set(article.id, score);
        }
        // Add delay between requests to respect rate limits
        await this.delay(200);
      });

      await Promise.all(promises);

      this.logger.info(`Scored ${Math.min(i + batchSize, articles.length)}/${articles.length} articles`);
    }

    return scores;
  }

  private buildScoringPrompt(article: Article): string {
    return `You are a news importance analyzer. Score the following news article on a scale of 0.0 to 1.0 based on:
- Impact on readers (local and global)
- Timeliness and relevance
- Significance of the event or topic
- Potential interest to a general audience
- Credibility and newsworthiness

Article:
Title: ${article.title}
Content: ${article.content?.substring(0, 500) || article.summary || 'No content available'}
Source: ${article.language === 'mn' ? 'Mongolian news source' : 'International news source'}
Published: ${article.published_at ? new Date(article.published_at).toLocaleDateString() : 'Recently'}

Return ONLY a JSON object in this exact format (no markdown, no extra text):
{
  "score": 0.85,
  "reason": "Brief explanation in one sentence"
}

The score must be between 0.0 and 1.0. Be objective and consider both local (Mongolian) and global significance.`;
  }

  private parseGeminiResponse(text: string): ArticleImportanceScore {
    try {
      // Remove markdown code blocks if present
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleanText);

      // Validate score is between 0 and 1
      const score = Math.max(0, Math.min(1, parseFloat(parsed.score)));

      return {
        score: score,
        reason: parsed.reason || 'No reason provided',
      };
    } catch (error) {
      this.logger.error('Failed to parse Gemini response:', error);
      this.logger.debug('Raw response:', text);
      return {
        score: 0.5,
        reason: 'Failed to parse AI response',
      };
    }
  }

  private fallbackScoring(article: Article): ArticleImportanceScore {
    // Simple heuristic-based scoring when Gemini is not available
    let score = 0.5; // Base score
    let reasons: string[] = [];

    // Boost for recent articles
    if (article.published_at) {
      const hoursSincePublished = (Date.now() - new Date(article.published_at).getTime()) / (1000 * 60 * 60);
      if (hoursSincePublished < 6) {
        score += 0.15;
        reasons.push('very recent');
      } else if (hoursSincePublished < 24) {
        score += 0.1;
        reasons.push('recent');
      }
    }

    // Boost for articles with images
    if (article.image_url) {
      score += 0.05;
    }

    // Boost for longer content (suggests more detailed reporting)
    if (article.content && article.content.length > 500) {
      score += 0.1;
      reasons.push('detailed coverage');
    }

    // Boost for Mongolian content (local relevance)
    if (article.language === 'mn') {
      score += 0.1;
      reasons.push('local news');
    }

    // Check for important keywords
    const importantKeywords = [
      'breaking', 'urgent', 'president', 'parliament', 'government', 'election',
      'ерөнхийлөгч', 'засаг', 'парламент', 'сонгууль'
    ];

    const titleLower = article.title.toLowerCase();
    const hasImportantKeyword = importantKeywords.some(kw => titleLower.includes(kw.toLowerCase()));
    if (hasImportantKeyword) {
      score += 0.1;
      reasons.push('high-impact keywords');
    }

    // Cap at 1.0
    score = Math.min(1.0, score);

    const reason = reasons.length > 0
      ? `Scored based on: ${reasons.join(', ')}`
      : 'Standard news article';

    return { score, reason };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
