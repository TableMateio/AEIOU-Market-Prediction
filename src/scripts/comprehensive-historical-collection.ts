#!/usr/bin/env tsx

/**
 * Comprehensive Historical Apple News Collection
 * 
 * Collects Apple articles across different time periods over the past year
 * Uses GNews API with strategic search queries and date targeting
 * Avoids duplicates and maximizes daily API quota (100 requests/day)
 */

import { config } from '../config/app';
import { createLogger } from '../utils/logger';

const logger = createLogger('HistoricalCollection');

interface GNewsArticle {
    title: string;
    description: string;
    content?: string;
    url: string;
    image?: string;
    publishedAt: string;
    source: {
        name: string;
        url: string;
    };
}

interface GNewsResponse {
    totalArticles: number;
    articles: GNewsArticle[];
}

// Strategic time periods across the past year
const TIME_PERIODS = [
    { from: '2024-01-01', to: '2024-02-29', label: 'Q1 2024' },
    { from: '2024-03-01', to: '2024-04-30', label: 'Q2 Start 2024' },
    { from: '2024-05-01', to: '2024-06-30', label: 'Q2 End 2024' },
    { from: '2024-07-01', to: '2024-08-31', label: 'Q3 2024' },
    { from: '2024-09-01', to: '2024-10-31', label: 'Q4 Start 2024' },
    { from: '2024-11-01', to: '2024-12-31', label: 'Q4 End 2024' },
    { from: '2023-10-01', to: '2023-12-31', label: 'Q4 2023' },
    { from: '2023-07-01', to: '2023-09-30', label: 'Q3 2023' },
];

// Strategic search queries for different Apple business areas
const SEARCH_QUERIES = [
    'Apple earnings',
    'Apple iPhone',
    'Apple AI',
    'Apple services',
    'Apple iPad',
    'Apple Mac',
    'Apple Watch',
    'Apple Vision',
    'Apple stock',
    'Apple revenue',
    'Apple vs Samsung',
    'Apple vs Google',
    'Apple partnership',
    'Apple acquisition',
    'Apple lawsuit',
];

async function fetchGNewsArticles(query: string, from?: string, to?: string): Promise<GNewsArticle[]> {
    if (!config.gnewsApiKey) {
        throw new Error('GNews API key not configured');
    }

    const params = new URLSearchParams({
        q: query,
        lang: 'en',
        country: 'us',
        max: '10', // 10 articles per request
        apikey: config.gnewsApiKey,
    });

    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const url = `https://gnews.io/api/v4/search?${params}`;

    try {
        logger.info(`Fetching: ${query} (${from || 'any'} to ${to || 'now'})`);

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GNews API error: ${response.status} - ${errorText}`);
        }

        const data: GNewsResponse = await response.json();
        logger.info(`✅ Found ${data.articles.length} articles for "${query}"`);

        return data.articles;
    } catch (error) {
        logger.error(`❌ Failed to fetch articles for "${query}":`, error);
        return [];
    }
}

function generateInsertSQL(articles: GNewsArticle[]): string {
    if (articles.length === 0) return '';

    const values = articles.map(article => {
        const cleanTitle = article.title.replace(/'/g, "''");
        const cleanDescription = article.description.replace(/'/g, "''");
        const cleanContent = article.content ? article.content.replace(/'/g, "''") : null;
        const cleanUrl = article.url.replace(/'/g, "''");
        const cleanSourceName = article.source.name.replace(/'/g, "''");

        return `(
            gen_random_uuid(),
            '${cleanTitle}',
            '${cleanDescription}',
            ${cleanContent ? `'${cleanContent}'` : 'NULL'},
            '${cleanUrl}',
            '${cleanSourceName}',
            '${article.publishedAt}',
            'pending',
            NOW(),
            NOW()
        )`;
    }).join(',\n    ');

    return `
INSERT INTO articles (
    id, headline, summary, body, url, source, published_at, 
    scraping_status, created_at, updated_at
) VALUES
    ${values}
ON CONFLICT (url) DO UPDATE SET
    headline = EXCLUDED.headline,
    summary = EXCLUDED.summary,
    body = COALESCE(EXCLUDED.body, articles.body),
    source = EXCLUDED.source,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();
`;
}

async function main() {
    logger.info('🚀 Starting comprehensive historical Apple news collection');

    const allArticles: GNewsArticle[] = [];
    let requestCount = 0;
    const maxRequests = 95; // Leave some buffer from daily limit of 100

    // Strategy 1: Time-based collection across quarters
    for (const period of TIME_PERIODS) {
        if (requestCount >= maxRequests) break;

        logger.info(`📅 Collecting articles from ${period.label}`);

        // Use strategic queries for each time period
        const priorityQueries = ['Apple earnings', 'Apple iPhone', 'Apple AI', 'Apple stock'];

        for (const query of priorityQueries) {
            if (requestCount >= maxRequests) break;

            const articles = await fetchGNewsArticles(query, period.from, period.to);
            allArticles.push(...articles);
            requestCount++;

            // Rate limiting - small delay between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // Strategy 2: Recent high-impact topics (no date filter for recent coverage)
    if (requestCount < maxRequests) {
        logger.info('📱 Collecting recent high-impact topics');

        const recentQueries = ['Apple Vision Pro', 'Apple AI Claude', 'Apple EU DMA', 'Apple China sales'];

        for (const query of recentQueries) {
            if (requestCount >= maxRequests) break;

            const articles = await fetchGNewsArticles(query);
            allArticles.push(...articles);
            requestCount++;

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // Remove duplicates by URL
    const uniqueArticles = allArticles.filter((article, index, self) =>
        index === self.findIndex(a => a.url === article.url)
    );

    logger.info(`📊 Collection Summary:`);
    logger.info(`  Total API requests: ${requestCount}`);
    logger.info(`  Raw articles collected: ${allArticles.length}`);
    logger.info(`  Unique articles: ${uniqueArticles.length}`);
    logger.info(`  Remaining daily quota: ${100 - requestCount}`);

    if (uniqueArticles.length > 0) {
        const sql = generateInsertSQL(uniqueArticles);

        // Write SQL to file for manual execution
        const fs = await import('fs/promises');
        await fs.writeFile('/tmp/historical_articles_insert.sql', sql);

        logger.info('📝 Generated SQL for manual execution:');
        console.log('\n=== EXECUTE THIS SQL IN MCP ===');
        console.log(sql.substring(0, 500) + '...\n');
        console.log('Full SQL saved to: /tmp/historical_articles_insert.sql');
    } else {
        logger.warn('⚠️ No articles collected - check API key and quota');
    }
}

if (require.main === module) {
    main().catch(console.error);
}
