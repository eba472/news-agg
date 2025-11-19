export class NewsletterTemplate {
  static generateHtml(data: {
    date: Date;
    mongolianNews: any[];
    globalNews: any[];
    topCategories: Record<string, any[]>;
  }): string {
    const dateStr = data.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily News Digest - ${dateStr}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1a1a1a;
      border-bottom: 3px solid #007bff;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    h2 {
      color: #007bff;
      margin-top: 30px;
      margin-bottom: 15px;
      font-size: 24px;
    }
    h3 {
      color: #495057;
      margin-top: 20px;
      margin-bottom: 10px;
      font-size: 18px;
    }
    .article {
      margin-bottom: 25px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e9ecef;
    }
    .article:last-child {
      border-bottom: none;
    }
    .article-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .article-title a {
      color: #1a1a1a;
      text-decoration: none;
    }
    .article-title a:hover {
      color: #007bff;
    }
    .article-meta {
      font-size: 13px;
      color: #6c757d;
      margin-bottom: 8px;
    }
    .article-summary {
      color: #495057;
      font-size: 15px;
      line-height: 1.5;
    }
    .article-image {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      margin-top: 10px;
    }
    .source-badge {
      display: inline-block;
      padding: 2px 8px;
      background-color: #e9ecef;
      border-radius: 3px;
      font-size: 12px;
      color: #495057;
      margin-right: 8px;
    }
    .date-header {
      color: #6c757d;
      font-size: 14px;
      margin-bottom: 30px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e9ecef;
      text-align: center;
      font-size: 13px;
      color: #6c757d;
    }
    .section-intro {
      font-style: italic;
      color: #6c757d;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📰 Daily News Digest</h1>
    <div class="date-header">${dateStr}</div>

    ${this.generateSection('🇲🇳 Mongolian News', data.mongolianNews, 'Latest news from Mongolia')}

    ${this.generateSection('🌍 Global News', data.globalNews, 'Top international stories')}

    ${this.generateCategorySections(data.topCategories)}

    <div class="footer">
      <p>This newsletter was automatically curated from trusted news sources.</p>
      <p>Stay informed, stay connected.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private static generateSection(title: string, articles: any[], intro?: string): string {
    if (!articles || articles.length === 0) return '';

    return `
    <h2>${title}</h2>
    ${intro ? `<p class="section-intro">${intro}</p>` : ''}
    ${articles.map(article => this.generateArticleHtml(article)).join('\n')}
    `;
  }

  private static generateCategorySections(categories: Record<string, any[]>): string {
    return Object.entries(categories)
      .map(([category, articles]) => {
        if (!articles || articles.length === 0) return '';
        const icon = this.getCategoryIcon(category);
        return this.generateSection(`${icon} ${category}`, articles);
      })
      .join('\n');
  }

  private static generateArticleHtml(article: any): string {
    return `
    <div class="article">
      <div class="article-title">
        <a href="${article.url}" target="_blank">${article.title}</a>
      </div>
      <div class="article-meta">
        <span class="source-badge">${article.source_name}</span>
        ${article.published_at ? new Date(article.published_at).toLocaleString() : ''}
      </div>
      ${article.summary ? `<div class="article-summary">${article.summary}</div>` : ''}
      ${article.image_url ? `<img src="${article.image_url}" alt="${article.title}" class="article-image">` : ''}
    </div>
    `;
  }

  private static getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      Politics: '🏛️',
      Business: '💼',
      Technology: '💻',
      Sports: '⚽',
      Entertainment: '🎬',
      Health: '🏥',
      Science: '🔬',
      Economy: '📊',
      World: '🌍',
      Local: '🏘️',
    };
    return icons[category] || '📌';
  }

  static generatePlainText(data: {
    date: Date;
    mongolianNews: any[];
    globalNews: any[];
    topCategories: Record<string, any[]>;
  }): string {
    const dateStr = data.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let text = `DAILY NEWS DIGEST - ${dateStr}\n`;
    text += '='.repeat(50) + '\n\n';

    if (data.mongolianNews.length > 0) {
      text += '🇲🇳 MONGOLIAN NEWS\n';
      text += '-'.repeat(50) + '\n';
      data.mongolianNews.forEach((article, index) => {
        text += `${index + 1}. ${article.title}\n`;
        text += `   Source: ${article.source_name}\n`;
        text += `   ${article.url}\n\n`;
      });
    }

    if (data.globalNews.length > 0) {
      text += '\n🌍 GLOBAL NEWS\n';
      text += '-'.repeat(50) + '\n';
      data.globalNews.forEach((article, index) => {
        text += `${index + 1}. ${article.title}\n`;
        text += `   Source: ${article.source_name}\n`;
        text += `   ${article.url}\n\n`;
      });
    }

    return text;
  }
}
