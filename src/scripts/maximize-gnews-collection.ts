#!/usr/bin/env tsx

/**
 * Maximize GNews Collection
 * 
 * Focus specifically on GNews API since it has 100% body text success rate
 * Use remaining daily quota strategically for maximum Apple coverage
 */

import { config } from '../config/app';
import { createLogger } from '../utils/logger';

const logger = createLogger('MaximizeGNews');

interface GNewsArticle {
    title: string;
    description: string;
    content: string;
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

// High-value Apple search terms for maximum relevance
const HIGH_VALUE_QUERIES = [
    // Core business
    'Apple earnings report',
    'Apple quarterly results',
    'Apple revenue guidance',
    'Apple stock price target',

    // Major products 
    'Apple iPhone sales',
    'Apple Mac sales',
    'Apple iPad revenue',
    'Apple Watch growth',
    'Apple AirPods market',

    // Strategic initiatives
    'Apple services revenue',
    'Apple AI strategy',
    'Apple Vision Pro sales',
    'Apple autonomous car',
    'Apple health technology',

    // Market dynamics
    'Apple vs Google competition',
    'Apple vs Samsung market share',
    'Apple China business',
    'Apple EU regulation',
    'Apple supply chain',

    // Recent developments
    'Apple Intelligence features',
    'Apple App Store changes',
    'Apple privacy updates',
    'Apple developer relations',
    'Apple sustainability'
];

async function fetchGNewsArticles(query: string, maxArticles: number = 10): Promise<GNewsArticle[]> {
    if (!config.gnewsApiKey) {
        throw new Error('GNews API key not configured');
    }

    const params = new URLSearchParams({
        q: query,
        lang: 'en',
        country: 'us',
        max: maxArticles.toString(),
        apikey: config.gnewsApiKey,
    });

    const url = `https://gnews.io/api/v4/search?${params}`;

    try {
        logger.info(`Fetching: "${query}" (max ${maxArticles})`);

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();

            if (response.status === 403 && errorText.includes('quota')) {
                logger.warn(`❌ API quota exceeded for today`);
                return [];
            }

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
            'gnews',
            'gnews',
            NOW(),
            NOW()
        )`;
    }).join(',\n    ');

    return `
INSERT INTO articles (
    id, title, summary, body, url, source, published_at, 
    scraping_status, data_source, external_id_type, created_at, updated_at
) VALUES
    ${values}
ON CONFLICT (url) DO UPDATE SET
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    body = COALESCE(EXCLUDED.body, articles.body),
    source = EXCLUDED.source,
    published_at = EXCLUDED.published_at,
    data_source = EXCLUDED.data_source,
    external_id_type = EXCLUDED.external_id_type,
    updated_at = NOW();
`;
}

async function main() {
    logger.info('🚀 Starting maximized GNews collection for Apple coverage');

    const allArticles: GNewsArticle[] = [];
    let requestCount = 0;
    const maxRequests = 85; // Conservative limit to avoid quota issues

    logger.info(`📊 Targeting ${HIGH_VALUE_QUERIES.length} high-value search queries`);

    for (const query of HIGH_VALUE_QUERIES) {
        if (requestCount >= maxRequests) {
            logger.warn(`⚠️ Reached request limit (${maxRequests}), stopping collection`);
            break;
        }

        const articles = await fetchGNewsArticles(query, 10);

        if (articles.length === 0 && requestCount > 10) {
            // Likely hit quota, stop trying
            logger.warn(`⚠️ No articles returned, likely hit API quota. Stopping.`);
            break;
        }

        allArticles.push(...articles);
        requestCount++;

        // Rate limiting - 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Remove duplicates by URL
    const uniqueArticles = allArticles.filter((article, index, self) =>
        index === self.findIndex(a => a.url === article.url)
    );

    logger.info(`📊 Collection Summary:`);
    logger.info(`  API requests made: ${requestCount}`);
    logger.info(`  Raw articles collected: ${allArticles.length}`);
    logger.info(`  Unique articles: ${uniqueArticles.length}`);
    logger.info(`  Remaining daily quota: ~${100 - requestCount}`);

    if (uniqueArticles.length > 0) {
        const sql = generateInsertSQL(uniqueArticles);

        // Write SQL to file for execution
        const fs = await import('fs/promises');
        await fs.writeFile('/tmp/maximize_gnews_insert.sql', sql);

        logger.info('📝 Generated SQL for GNews article insertion');
        logger.info(`📁 File: /tmp/maximize_gnews_insert.sql`);

        // Show sample for verification
        console.log('\n=== SAMPLE SQL (first 300 chars) ===');
        console.log(sql.substring(0, 300) + '...\n');

        console.log('=== EXECUTION INSTRUCTIONS ===');
        console.log('1. Verify SQL looks correct');
        console.log('2. Execute: cat /tmp/maximize_gnews_insert.sql');
        console.log('3. Copy and paste into MCP terminal');
        console.log('================================\n');
    } else {
        logger.warn('⚠️ No articles collected - check API key and quota');
    }
}

if (require.main === module) {
    main().catch(console.error);
}
