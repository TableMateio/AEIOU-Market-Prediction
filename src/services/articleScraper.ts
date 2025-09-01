/**
 * Article Content Scraper
 * 
 * Scrapes full article content from URLs with robust error handling
 * and content quality validation
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { createLogger } from '../utils/logger';

const logger = createLogger('ArticleScraper');

export interface ScrapingOptions {
    timeout: number;
    retryAttempts: number;
}

export interface ScrapingTestResult {
    success: boolean;
    textLength: number;
    preview: string;
    error?: string;
}

export interface ArticleContent {
    url: string;
    title: string;
    summary: string;
    fullText: string;
    publishedTime: Date;
    source: string;
    authors: string[];
}

export default class ArticleScraper {
    private options: ScrapingOptions;

    constructor(options: ScrapingOptions = { timeout: 15000, retryAttempts: 2 }) {
        this.options = options;
    }

    /**
     * Test scraping a URL without full processing
     */
    async testScraping(url: string): Promise<ScrapingTestResult> {
        try {
            logger.info(`Testing scraping for: ${url}`);

            const response = await axios.get(url, {
                timeout: this.options.timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const extractedText = this.extractArticleText($);

            return {
                success: true,
                textLength: extractedText.length,
                preview: extractedText.substring(0, 200),
                error: undefined
            };

        } catch (error) {
            logger.error(`Scraping test failed for ${url}:`, error);
            return {
                success: false,
                textLength: 0,
                preview: '',
                error: error.message
            };
        }
    }

    /**
     * Scrape full article content
     */
    async scrapeArticle(
        url: string,
        title: string,
        summary: string,
        publishedTime: Date,
        source: string,
        authors: string[]
    ): Promise<ArticleContent> {
        let lastError: Error;

        for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
            try {
                logger.info(`Scraping attempt ${attempt}/${this.options.retryAttempts} for: ${title.substring(0, 50)}...`);

                const response = await axios.get(url, {
                    timeout: this.options.timeout,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });

                const $ = cheerio.load(response.data);
                const fullText = this.extractArticleText($);

                // Validate content quality
                const quality = this.validateContentQuality(fullText, title);

                if (!quality.isValid) {
                    logger.warn(`Content quality issues for ${url}: ${quality.issues.join(', ')}`);
                }

                logger.info(`✅ Successfully scraped ${fullText.length} characters from ${url}`);

                return {
                    url,
                    title,
                    summary,
                    fullText,
                    publishedTime,
                    source,
                    authors
                };

            } catch (error) {
                lastError = error;
                logger.warn(`Scraping attempt ${attempt} failed for ${url}: ${error.message}`);

                if (attempt < this.options.retryAttempts) {
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }

        // All attempts failed - return with summary as fallback
        logger.error(`All scraping attempts failed for ${url}, using summary as fallback`);
        return {
            url,
            title,
            summary,
            fullText: summary, // Fallback to summary
            publishedTime,
            source,
            authors
        };
    }

    /**
     * Extract article text from HTML using multiple strategies
     */
    private extractArticleText($: cheerio.CheerioAPI): string {
        let content = '';

        // Strategy 1: Look for common article selectors
        const articleSelectors = [
            'article',
            '.article-content',
            '.article-body',
            '.post-content',
            '.entry-content',
            '.content',
            '[data-module="ArticleBody"]',
            '.story-body',
            '.article-text'
        ];

        for (const selector of articleSelectors) {
            const element = $(selector);
            if (element.length > 0) {
                content = element.text().trim();
                if (content.length > 500) { // Reasonable content length
                    break;
                }
            }
        }

        // Strategy 2: Look for paragraphs if no main content found
        if (content.length < 500) {
            const paragraphs = $('p').map((i, el) => $(el).text().trim()).get();
            content = paragraphs.join('\n\n');
        }

        // Strategy 3: Get all text as last resort
        if (content.length < 200) {
            content = $('body').text().trim();
        }

        // Clean up the content
        return this.cleanText(content);
    }

    /**
     * Clean extracted text
     */
    private cleanText(text: string): string {
        return text
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/\n\s*\n/g, '\n\n') // Normalize line breaks
            .trim();
    }

    /**
     * Validate content quality
     */
    private validateContentQuality(content: string, title: string): {
        isValid: boolean;
        issues: string[];
    } {
        const issues: string[] = [];

        // Check for common issues
        if (content.length < 100) {
            issues.push('Content too short');
        }

        if (content.includes('subscribe') && content.includes('paywall')) {
            issues.push('Potential paywall content');
        }

        if (content.includes('404') || content.includes('Page not found')) {
            issues.push('Page not found');
        }

        if (content.includes('Please enable JavaScript')) {
            issues.push('JavaScript required');
        }

        if (content.toLowerCase().includes('cookie') && content.toLowerCase().includes('consent') && content.length < 500) {
            issues.push('Cookie consent page');
        }

        const repetitivePattern = /(.{10,})\1{3,}/; // Same text repeated 3+ times
        if (repetitivePattern.test(content)) {
            issues.push('Repetitive content pattern');
        }

        return {
            isValid: issues.length === 0,
            issues
        };
    }
}
