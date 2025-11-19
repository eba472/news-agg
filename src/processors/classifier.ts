import { Logger } from '../utils/logger';
import { Article } from '../types';

export class ArticleClassifier {
  private logger: Logger;

  // Keyword mapping for categories in both English and Mongolian
  private categoryKeywords: Record<string, { en: string[]; mn: string[] }> = {
    Politics: {
      en: ['government', 'parliament', 'minister', 'president', 'election', 'politics', 'policy', 'law', 'senate', 'congress'],
      mn: ['засаг', 'парламент', 'сайд', 'ерөнхийлөгч', 'сонгууль', 'улс төр', 'бодлого', 'хууль'],
    },
    Business: {
      en: ['business', 'company', 'market', 'stock', 'trade', 'finance', 'bank', 'investment', 'entrepreneur', 'startup'],
      mn: ['бизнес', 'компани', 'зах зээл', 'арилжаа', 'санхүү', 'банк', 'хөрөнгө оруулалт'],
    },
    Technology: {
      en: ['technology', 'tech', 'software', 'app', 'digital', 'internet', 'ai', 'artificial intelligence', 'computer', 'startup'],
      mn: ['технологи', 'програм', 'дижитал', 'интернет', 'компьютер', 'хиймэл оюун'],
    },
    Sports: {
      en: ['sports', 'football', 'soccer', 'basketball', 'game', 'team', 'player', 'match', 'championship', 'olympic'],
      mn: ['спорт', 'хөлбөмбөг', 'сагсан бөмбөг', 'тоглолт', 'баг', 'тоглогч', 'аварга'],
    },
    Entertainment: {
      en: ['entertainment', 'movie', 'film', 'music', 'celebrity', 'actor', 'singer', 'concert', 'show', 'art'],
      mn: ['үзвэр', 'кино', 'хөгжим', 'алдартан', 'жүжигчин', 'дуучин', 'концерт', 'урлаг'],
    },
    Health: {
      en: ['health', 'medical', 'hospital', 'doctor', 'disease', 'medicine', 'patient', 'coronavirus', 'covid', 'vaccine'],
      mn: ['эрүүл мэнд', 'эмнэлэг', 'эмч', 'өвчин', 'эм', 'өвчтөн', 'вакцин'],
    },
    Science: {
      en: ['science', 'research', 'study', 'scientist', 'discovery', 'space', 'nasa', 'climate', 'environment'],
      mn: ['шинжлэх ухаан', 'судалгаа', 'эрдэмтэн', 'нээлт', 'сансар', 'уур амьсгал', 'байгаль'],
    },
    Economy: {
      en: ['economy', 'economic', 'gdp', 'inflation', 'unemployment', 'budget', 'tax', 'monetary', 'fiscal'],
      mn: ['эдийн засаг', 'инфляци', 'ажилгүйдэл', 'төсөв', 'татвар', 'мөнгө'],
    },
    World: {
      en: ['world', 'international', 'global', 'country', 'nation', 'foreign', 'diplomatic', 'united nations', 'war'],
      mn: ['дэлхий', 'олон улс', 'гадаад', 'дипломат', 'нэгдсэн үндэстэн', 'дайн'],
    },
    Local: {
      en: ['local', 'city', 'town', 'community', 'municipal', 'regional'],
      mn: ['орон нутаг', 'хот', 'нийслэл', 'аймаг', 'сум', 'дүүрэг'],
    },
  };

  constructor() {
    this.logger = new Logger('ArticleClassifier');
  }

  classifyArticle(article: Article): { category: string; confidence: number }[] {
    const text = `${article.title} ${article.content || ''}`.toLowerCase();
    const categories: { category: string; confidence: number }[] = [];

    for (const [categoryName, keywords] of Object.entries(this.categoryKeywords)) {
      const score = this.calculateCategoryScore(text, keywords.en.concat(keywords.mn));

      if (score > 0) {
        categories.push({
          category: categoryName,
          confidence: Math.min(score / 10, 1.0), // Normalize to 0-1
        });
      }
    }

    // Sort by confidence
    categories.sort((a, b) => b.confidence - a.confidence);

    // Return top 3 categories
    const topCategories = categories.slice(0, 3);

    // If no categories found, assign "World" for international or "Local" for Mongolian
    if (topCategories.length === 0) {
      const defaultCategory = article.language === 'mn' ? 'Local' : 'World';
      return [{ category: defaultCategory, confidence: 0.5 }];
    }

    this.logger.debug(`Classified article "${article.title.substring(0, 50)}..." as:`, topCategories);
    return topCategories;
  }

  private calculateCategoryScore(text: string, keywords: string[]): number {
    let score = 0;

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        score += matches.length;
      }
    }

    return score;
  }

  generateSummary(article: Article): string {
    // Simple extractive summarization - take first 2 sentences
    if (!article.content) {
      return article.title;
    }

    const sentences = article.content
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20);

    const summary = sentences.slice(0, 2).join('. ');
    return summary.length > 200 ? summary.substring(0, 200) + '...' : summary + '.';
  }
}
