import axios from 'axios';
import * as cheerio from 'cheerio';

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  region: string;
  timestamp: string;
  summary?: string;
}

export interface RssFeed {
  id: string;           // short slug
  name: string;         // display name
  region: string;       // coverage region tag
  feedUrl: string;      // public RSS/Atom URL
  fallbackUrls?: string[]; // ordered backups for feeds that block or move their primary URL
  homepageUrl: string;  // for link fallback
  enabled: boolean;
  weight: number;       // sort priority (lower = more important)
}

/**
 * The global RSS registry. To add a new source, just append an entry here.
 * RSS is the right primitive for news scraping — it's public, stable, and
 * has a documented schema. We never have to worry about site redesigns.
 */
export const RSS_FEEDS: RssFeed[] = [
  // === Middle East ===
  { id: 'reuters_me', name: 'Reuters (via Google News)', region: 'middle_east', feedUrl: 'https://news.google.com/rss/search?q=reuters+world&hl=en-US&gl=US&ceid=US:en', homepageUrl: 'https://www.reuters.com', enabled: true, weight: 1 },
  { id: 'aljazeera', name: 'Al Jazeera', region: 'middle_east', feedUrl: 'https://www.aljazeera.com/xml/rss/all.xml', homepageUrl: 'https://www.aljazeera.com', enabled: true, weight: 2 },
  { id: 'toi', name: 'Times of Israel', region: 'israel', feedUrl: 'https://www.timesofisrael.com/feed/', fallbackUrls: ['https://news.google.com/rss/search?q=site%3Atimesofisrael.com&hl=en-US&gl=US&ceid=US:en'], homepageUrl: 'https://www.timesofisrael.com', enabled: true, weight: 1 },
  { id: 'middle_easteye', name: 'Middle East Eye', region: 'middle_east', feedUrl: 'https://www.middleeasteye.net/rss', fallbackUrls: ['https://www.middleeasteye.net/rss.xml'], homepageUrl: 'https://www.middleeasteye.net', enabled: true, weight: 4 },
  { id: 'voa_me', name: 'VOA Middle East', region: 'middle_east', feedUrl: 'https://www.voanews.com/rss', homepageUrl: 'https://www.voanews.com', enabled: true, weight: 5 },
  { id: 'i24news', name: 'i24 News', region: 'israel', feedUrl: 'https://www.i24news.tv/en/rss', homepageUrl: 'https://www.i24news.tv', enabled: true, weight: 5 },
  { id: 'jpost', name: 'Jerusalem Post', region: 'israel', feedUrl: 'https://www.jpost.com/rss/rssfeedsfrontpage.aspx', homepageUrl: 'https://www.jpost.com', enabled: true, weight: 5 },

  // === Conflict / War ===
  { id: 'bbc_world', name: 'BBC World', region: 'world', feedUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml', homepageUrl: 'https://www.bbc.com/news/world', enabled: true, weight: 1 },
  { id: 'ap_top', name: 'AP News (via Google News)', region: 'world', feedUrl: 'https://news.google.com/rss/search?q=ap+news+world&hl=en-US&gl=US&ceid=US:en', homepageUrl: 'https://apnews.com', enabled: true, weight: 2 },
  { id: 'guardian_world', name: 'The Guardian World', region: 'world', feedUrl: 'https://www.theguardian.com/world/rss', homepageUrl: 'https://www.theguardian.com/world', enabled: true, weight: 2 },
  { id: 'nyt_world', name: 'NYT World', region: 'world', feedUrl: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', homepageUrl: 'https://www.nytimes.com/section/world', enabled: true, weight: 2 },
  { id: 'france24', name: 'France 24', region: 'world', feedUrl: 'https://www.france24.com/en/rss', homepageUrl: 'https://www.france24.com/en/', enabled: true, weight: 3 },
  { id: 'dw', name: 'Deutsche Welle', region: 'world', feedUrl: 'https://rss.dw.com/xml/rss-en-world', homepageUrl: 'https://www.dw.com/en/', enabled: true, weight: 3 },
  { id: 'cbs_news', name: 'CBS News', region: 'world', feedUrl: 'https://www.cbsnews.com/latest/rss/main', homepageUrl: 'https://www.cbsnews.com', enabled: true, weight: 4 },
  { id: 'abc_news', name: 'ABC News Top Stories', region: 'world', feedUrl: 'https://abcnews.go.com/abcnews/topstories', homepageUrl: 'https://abcnews.go.com', enabled: true, weight: 4 },
  { id: 'cnn_world_gn', name: 'CNN World (via Google News)', region: 'world', feedUrl: 'https://news.google.com/rss/search?q=cnn+world&hl=en-US&gl=US&ceid=US:en', homepageUrl: 'https://www.cnn.com/world', enabled: true, weight: 4 },
  { id: 'npr_world', name: 'NPR World', region: 'world', feedUrl: 'https://feeds.npr.org/1001/rss.xml', homepageUrl: 'https://www.npr.org', enabled: true, weight: 4 },
  { id: 'politico_world', name: 'Politico', region: 'world', feedUrl: 'https://www.politico.com/rss/politicopicks.xml', fallbackUrls: ['https://news.google.com/rss/search?q=site%3Apolitico.com&hl=en-US&gl=US&ceid=US:en'], homepageUrl: 'https://www.politico.com', enabled: true, weight: 5 },
  { id: 'la_times', name: 'LA Times World', region: 'world', feedUrl: 'https://www.latimes.com/world/rss2.0.xml', homepageUrl: 'https://www.latimes.com/world', enabled: true, weight: 5 },
  { id: 'straitstimes', name: 'The Straits Times', region: 'world', feedUrl: 'https://www.straitstimes.com/news/world/rss.xml', homepageUrl: 'https://www.straitstimes.com', enabled: true, weight: 5 },
  { id: 'independent_uk', name: 'The Independent', region: 'world', feedUrl: 'https://www.independent.co.uk/news/world/rss', homepageUrl: 'https://www.independent.co.uk', enabled: true, weight: 5 },

  // === Regional ===
  { id: 'scmp', name: 'South China Morning Post', region: 'asia', feedUrl: 'https://www.scmp.com/rss/91/feed/', homepageUrl: 'https://www.scmp.com', enabled: true, weight: 3 },
  { id: 'kyodo', name: 'Kyodo News (via Google News)', region: 'asia', feedUrl: 'https://news.google.com/rss/search?q=kyodo+news&hl=en-US&gl=US&ceid=US:en', homepageUrl: 'https://english.kyodonews.net', enabled: true, weight: 4 },
  { id: 'toi_india', name: 'Times of India', region: 'south_asia', feedUrl: 'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms', homepageUrl: 'https://timesofindia.indiatimes.com', enabled: true, weight: 4 },
  { id: 'the_hindu', name: 'The Hindu', region: 'south_asia', feedUrl: 'https://www.thehindu.com/news/international/feeder/default.rss', homepageUrl: 'https://www.thehindu.com', enabled: true, weight: 5 },
  { id: 'indian_express', name: 'Indian Express', region: 'south_asia', feedUrl: 'https://indianexpress.com/section/world/feed/', homepageUrl: 'https://indianexpress.com', enabled: true, weight: 5 },
  { id: 'tass', name: 'TASS', region: 'russia', feedUrl: 'https://tass.com/rss/v2.xml', homepageUrl: 'https://tass.com', enabled: true, weight: 5 },
  { id: 'kyiv_independent', name: 'Kyiv Independent (via Google News)', region: 'eastern_europe', feedUrl: 'https://news.google.com/rss/search?q=kyiv+independent&hl=en-US&gl=US&ceid=US:en', homepageUrl: 'https://kyivindependent.com', enabled: true, weight: 1 },

  // === Africa / LatAm / Oceania ===
  { id: 'abc_au', name: 'ABC News Australia', region: 'oceania', feedUrl: 'https://www.abc.net.au/news/feed/51120/rss.xml', homepageUrl: 'https://www.abc.net.au/news', enabled: true, weight: 4 },

  // === Tech / OSINT-adjacent ===
  { id: 'reuters_tech', name: 'Reuters Tech (via Google News)', region: 'tech', feedUrl: 'https://news.google.com/rss/search?q=reuters+technology&hl=en-US&gl=US&ceid=US:en', homepageUrl: 'https://www.reuters.com/technology', enabled: true, weight: 6 },
  { id: 'hn', name: 'Hacker News', region: 'tech', feedUrl: 'https://news.ycombinator.com/rss', homepageUrl: 'https://news.ycombinator.com', enabled: true, weight: 3 },
];

const feedCache: Map<string, { data: NewsItem[]; timestamp: number }> = new Map();
const FEED_CACHE_TTL = 10 * 60 * 1000; // 10 min — RSS feeds update slowly
const FEED_TIMEOUT = 12_000;

/**
 * Parse RSS 2.0 / Atom / RDF into a normalized list of NewsItem.
 * Defensive: skips malformed items, never throws.
 */
export function parseFeedXml(xml: string, feed: RssFeed): NewsItem[] {
  try {
    const $ = cheerio.load(xml, { xmlMode: true });
    const items: NewsItem[] = [];
    const seen = new Set<string>();

    // RSS 2.0
    $('item').each((_, el) => {
      const title = $(el).find('title').first().text().trim();
      const link = $(el).find('link').first().text().trim() || $(el).find('guid').first().text().trim();
      const pubDate = $(el).find('pubDate').first().text().trim();
      const desc = $(el).find('description').first().text().trim();
      if (title && link && !seen.has(link)) {
        seen.add(link);
        items.push({
          title: stripHtml(title).slice(0, 200),
          url: link,
          source: feed.name,
          region: feed.region,
          timestamp: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          summary: desc ? stripHtml(desc).slice(0, 240) : undefined,
        });
      }
    });

    // Atom
    if (items.length === 0) {
      $('entry').each((_, el) => {
        const title = $(el).find('title').first().text().trim();
        const linkEl = $(el).find('link[href]').first();
        const link = linkEl.attr('href') || '';
        const pubDate = $(el).find('updated, published').first().text().trim();
        const desc = $(el).find('summary, content').first().text().trim();
        if (title && link && !seen.has(link)) {
          seen.add(link);
          items.push({
            title: stripHtml(title).slice(0, 200),
            url: link,
            source: feed.name,
            region: feed.region,
            timestamp: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            summary: desc ? stripHtml(desc).slice(0, 240) : undefined,
          });
        }
      });
    }

    return items.slice(0, 25);
  } catch (e: any) {
    console.error(`[rss] ${feed.id} parse error: ${e.message}`);
    return [];
  }
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

export interface FeedHealth {
  id: string;
  name: string;
  region: string;
  ok: boolean;
  itemCount: number;
  lastFetched: string | null;
  lastError?: string;
  url?: string;
}

const feedHealth: Map<string, FeedHealth> = new Map();

/**
 * Fetch one feed. Cached for FEED_CACHE_TTL. Records health.
 */
export async function fetchFeed(feed: RssFeed, useCache = true): Promise<NewsItem[]> {
  if (!feed.enabled) return [];

  const cached = feedCache.get(feed.id);
  if (useCache && cached && Date.now() - cached.timestamp < FEED_CACHE_TTL) {
    return cached.data;
  }

  const urls = [feed.feedUrl, ...(feed.fallbackUrls || [])];
  const errors: string[] = [];

  for (const url of urls) {
    try {
      const res = await axios.get(url, {
        timeout: FEED_TIMEOUT,
        headers: {
          'User-Agent': 'ClawdWatch-Lobster/1.0 (+https://github.com/Franzferdinan51/clawdwatch-lobster-edition)',
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        },
        // Don't barf on non-2xx; try the next configured URL instead.
        validateStatus: () => true,
      });

      if (res.status >= 400) {
        errors.push(`${url}: HTTP ${res.status}`);
        continue;
      }

      const items = parseFeedXml(res.data, feed);
      feedCache.set(feed.id, { data: items, timestamp: Date.now() });
      feedHealth.set(feed.id, {
        id: feed.id, name: feed.name, region: feed.region, ok: true,
        itemCount: items.length, lastFetched: new Date().toISOString(), url,
      });
      return items;
    } catch (e: any) {
      errors.push(`${url}: ${e.message?.slice(0, 100) || 'fetch failed'}`);
    }
  }

  feedHealth.set(feed.id, {
    id: feed.id, name: feed.name, region: feed.region, ok: false,
    itemCount: 0, lastFetched: new Date().toISOString(),
    lastError: errors.join('; ').slice(0, 240), url: feed.feedUrl,
  });
  return [];
}

/**
 * Fetch many feeds in parallel. Tolerant of failures.
 */
export async function fetchFeeds(feeds: RssFeed[] = RSS_FEEDS, useCache = true): Promise<NewsItem[]> {
  const results = await Promise.all(feeds.map((f) => fetchFeed(f, useCache)));
  return results.flat();
}

export function getFeedHealth(): FeedHealth[] {
  return Array.from(feedHealth.values());
}

export function getFeedsByRegion(region: string): RssFeed[] {
  return RSS_FEEDS.filter((f) => f.region === region);
}
