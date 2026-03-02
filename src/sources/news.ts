import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * News Aggregation Source
 * Scrapes headlines from multiple news sources
 */

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  region: string;
  timestamp: Date;
}

export class NewsAggregator {
  private cache: Map<string, NewsItem[]> = new Map();
  private lastFetch: number = 0;
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch headlines from Reuters
   */
  async fetchReuters(): Promise<NewsItem[]> {
    try {
      const url = 'https://www.reuters.com/world/middle-east/';
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Clawdwatch/1.0)' },
        timeout: 10000,
      });
      
      const $ = cheerio.load(response.data);
      const items: NewsItem[] = [];
      
      $('article h3, [data-testid="Heading"] a').each((i, el) => {
        const title = $(el).text().trim();
        const link = $(el).attr('href') || $(el).find('a').attr('href');
        if (title && title.length > 10) {
          items.push({
            title: title.slice(0, 120),
            url: link?.startsWith('http') ? link : `https://www.reuters.com${link}`,
            source: 'Reuters',
            region: 'middle_east',
            timestamp: new Date(),
          });
        }
      });
      
      return items.slice(0, 10);
    } catch (error: any) {
      console.error('Reuters fetch error:', error.message);
      return [];
    }
  }

  /**
   * Fetch headlines from Al Jazeera
   */
  async fetchAlJazeera(): Promise<NewsItem[]> {
    try {
      const url = 'https://www.aljazeera.com/middle-east/';
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Clawdwatch/1.0)' },
        timeout: 10000,
      });
      
      const $ = cheerio.load(response.data);
      const items: NewsItem[] = [];
      
      $('article h3 a, .gc__title a').each((i, el) => {
        const title = $(el).text().trim();
        const link = $(el).attr('href');
        if (title && title.length > 10) {
          items.push({
            title: title.slice(0, 120),
            url: link?.startsWith('http') ? link : `https://www.aljazeera.com${link}`,
            source: 'Al Jazeera',
            region: 'middle_east',
            timestamp: new Date(),
          });
        }
      });
      
      return items.slice(0, 10);
    } catch (error: any) {
      console.error('Al Jazeera fetch error:', error.message);
      return [];
    }
  }

  /**
   * Fetch headlines from AP News
   */
  async fetchAP(): Promise<NewsItem[]> {
    try {
      const url = 'https://apnews.com/hub/middle-east';
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Clawdwatch/1.0)' },
        timeout: 10000,
      });
      
      const $ = cheerio.load(response.data);
      const items: NewsItem[] = [];
      
      $('h3 a, .PagePromo-title a').each((i, el) => {
        const title = $(el).text().trim();
        const link = $(el).attr('href');
        if (title && title.length > 10) {
          items.push({
            title: title.slice(0, 120),
            url: link?.startsWith('http') ? link : `https://apnews.com${link}`,
            source: 'AP News',
            region: 'middle_east',
            timestamp: new Date(),
          });
        }
      });
      
      return items.slice(0, 10);
    } catch (error: any) {
      console.error('AP fetch error:', error.message);
      return [];
    }
  }

  /**
   * Get all news from multiple sources
   */
  async fetchAll(): Promise<NewsItem[]> {
    const now = Date.now();
    
    // Return cached if recent
    if (this.cache.has('all') && now - this.lastFetch < this.cacheTimeout) {
      return this.cache.get('all') || [];
    }

    const [reuters, aljazeera, ap] = await Promise.all([
      this.fetchReuters(),
      this.fetchAlJazeera(),
      this.fetchAP(),
    ]);

    const all = [...reuters, ...aljazeera, ...ap];
    this.cache.set('all', all);
    this.lastFetch = now;
    
    return all;
  }

  /**
   * Search for keywords in headlines
   */
  async search(keywords: string[]): Promise<NewsItem[]> {
    const all = await this.fetchAll();
    const pattern = new RegExp(keywords.join('|'), 'i');
    return all.filter(item => pattern.test(item.title));
  }
}

export const newsAggregator = new NewsAggregator();
