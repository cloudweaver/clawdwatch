import axios from 'axios';

/**
 * Social Media Monitor
 * Tracks OSINT accounts and conflict-related posts
 */

export interface SocialPost {
  id: string;
  text: string;
  author: string;
  platform: 'twitter' | 'telegram' | 'reddit';
  url: string;
  timestamp: Date;
  isFirstHand: boolean;
  hasMedia: boolean;
}

// Known OSINT accounts to monitor
const OSINT_ACCOUNTS = [
  'IntelCrab',
  'OSINTdefender', 
  'Faytuks',
  'RALee85',
  'aurora_intel',
  'sentdefender',
  'GeoConfirmed',
  'MT_Anderson',
  'Aviation_Intel',
  'CITeam_en',
];

// Keywords for conflict monitoring
const CONFLICT_KEYWORDS = [
  'breaking',
  'airstrike',
  'missile',
  'explosion',
  'military',
  'attack',
  'strike',
  'Iran',
  'IRGC',
  'Tehran',
  'US Navy',
  'carrier',
  'drone',
  'intercept',
];

export class SocialMonitor {
  private posts: SocialPost[] = [];
  private bearerToken: string;

  constructor() {
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN || '';
  }

  isEnabled(): boolean {
    return !!this.bearerToken;
  }

  /**
   * Fetch from Twitter API v2 (requires bearer token)
   */
  async fetchTwitter(): Promise<SocialPost[]> {
    if (!this.bearerToken) {
      return [];
    }

    try {
      // Search for recent conflict-related tweets
      const query = encodeURIComponent(
        `(${CONFLICT_KEYWORDS.slice(0, 5).join(' OR ')}) (Iran OR "Middle East") -is:retweet`
      );
      
      const url = `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=20&tweet.fields=created_at,author_id`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
        },
        timeout: 10000,
      });

      if (!response.data.data) {
        return [];
      }

      return response.data.data.map((tweet: any) => ({
        id: tweet.id,
        text: tweet.text,
        author: tweet.author_id,
        platform: 'twitter' as const,
        url: `https://twitter.com/i/status/${tweet.id}`,
        timestamp: new Date(tweet.created_at),
        isFirstHand: this.isFirstHandAccount(tweet.author_id),
        hasMedia: false,
      }));
    } catch (error: any) {
      console.error('Twitter fetch error:', error.message);
      return [];
    }
  }

  /**
   * Fetch from Reddit (no auth needed for public)
   */
  async fetchReddit(): Promise<SocialPost[]> {
    try {
      const subreddits = ['worldnews', 'geopolitics', 'CombatFootage'];
      const posts: SocialPost[] = [];

      for (const sub of subreddits) {
        const url = `https://www.reddit.com/r/${sub}/search.json?q=Iran+OR+missile+OR+airstrike&sort=new&t=day&limit=5`;
        
        const response = await axios.get(url, {
          headers: { 'User-Agent': 'Clawdwatch/1.0' },
          timeout: 10000,
        });

        if (response.data.data?.children) {
          for (const child of response.data.data.children) {
            const post = child.data;
            posts.push({
              id: post.id,
              text: post.title,
              author: post.author,
              platform: 'reddit',
              url: `https://reddit.com${post.permalink}`,
              timestamp: new Date(post.created_utc * 1000),
              isFirstHand: false,
              hasMedia: !!post.url_overridden_by_dest,
            });
          }
        }
      }

      return posts.slice(0, 15);
    } catch (error: any) {
      console.error('Reddit fetch error:', error.message);
      return [];
    }
  }

  /**
   * Check if account is known OSINT source
   */
  isFirstHandAccount(authorId: string): boolean {
    // Would need to resolve author_id to username
    return false;
  }

  /**
   * Filter for first-hand accounts (not retweets/reposts)
   */
  filterFirstHand(posts: SocialPost[]): SocialPost[] {
    return posts.filter(p => p.isFirstHand || p.hasMedia);
  }

  /**
   * Get all social posts
   */
  async fetchAll(): Promise<SocialPost[]> {
    const [twitter, reddit] = await Promise.all([
      this.fetchTwitter(),
      this.fetchReddit(),
    ]);

    this.posts = [...twitter, ...reddit]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return this.posts;
  }

  /**
   * Get OSINT accounts list
   */
  getOSINTAccounts(): string[] {
    return OSINT_ACCOUNTS;
  }
}

export const socialMonitor = new SocialMonitor();
