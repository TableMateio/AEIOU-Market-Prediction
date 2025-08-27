import dotenv from 'dotenv';
import { createLogger } from '@utils/logger';

// Load environment variables
dotenv.config();

const logger = createLogger('AppConfig');

export interface SupabaseConfig {
    projectUrl: string;
    apiKey: string;
    serviceRoleKey?: string;
    dbPassword?: string;
}

export interface AirtableConfig {
    apiKey: string;
    baseId: string;
}

export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}

export interface ValidationConfig {
    minCorrelationThreshold: number;
    timestampAccuracyMinutes: number;
    newsCoverageThreshold: number;
}

export interface AppConfiguration {
    nodeEnv: string;
    port: number;
    
    // API Keys
    alphaVantageApiKey: string;
    yahooFinanceApiKey?: string;
    anthropicApiKey?: string;
    openaiApiKey?: string;
    
    // Database configurations
    supabaseConfig: SupabaseConfig;
    airtableConfig: AirtableConfig;
    
    // Rate limiting
    rateLimitConfig: RateLimitConfig;
    
    // Logging
    logLevel: string;
    logFormat: string;
    
    // Validation thresholds
    validationConfig: ValidationConfig;
    
    // Stock analysis
    defaultStockSymbols: string[];
    marketHoursStart: string;
    marketHoursEnd: string;
    timezone: string;
}

export class AppConfig {
    private static instance: AppConfig;
    private config: AppConfiguration;

    private constructor() {
        this.config = this.loadConfiguration();
        this.validateConfiguration();
    }

    public static getInstance(): AppConfig {
        if (!AppConfig.instance) {
            AppConfig.instance = new AppConfig();
        }
        return AppConfig.instance;
    }

    public get supabaseConfig(): SupabaseConfig {
        return this.config.supabaseConfig;
    }

    public get airtableConfig(): AirtableConfig {
        return this.config.airtableConfig;
    }

    public get rateLimitConfig(): RateLimitConfig {
        return this.config.rateLimitConfig;
    }

    public get validationConfig(): ValidationConfig {
        return this.config.validationConfig;
    }

    public get nodeEnv(): string {
        return this.config.nodeEnv;
    }

    public get port(): number {
        return this.config.port;
    }

    public get alphaVantageApiKey(): string {
        return this.config.alphaVantageApiKey;
    }

    public get defaultStockSymbols(): string[] {
        return this.config.defaultStockSymbols;
    }

    private loadConfiguration(): AppConfiguration {
        return {
            nodeEnv: process.env.NODE_ENV || 'development',
            port: parseInt(process.env.PORT || '3000', 10),
            
            // API Keys
            alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY || '',
            yahooFinanceApiKey: process.env.YAHOO_FINANCE_API_KEY,
            anthropicApiKey: process.env.ANTHROPIC_API_KEY,
            openaiApiKey: process.env.OPENAI_API_KEY,
            
            // Supabase Configuration
            supabaseConfig: {
                projectUrl: process.env.SUPABASE_PROJECT_URL || '',
                apiKey: process.env.SUPABASE_API_KEY || '',
                serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
                dbPassword: process.env.SUPABASE_DB_PASSWORD
            },
            
            // Airtable Configuration
            airtableConfig: {
                apiKey: process.env.AIRTABLE_API_KEY || '',
                baseId: process.env.AIRTABLE_BASE_ID || ''
            },
            
            // Rate Limiting
            rateLimitConfig: {
                windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '900000', 10),
                maxRequests: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || '25', 10)
            },
            
            // Logging
            logLevel: process.env.LOG_LEVEL || 'info',
            logFormat: process.env.LOG_FORMAT || 'simple',
            
            // Validation Thresholds
            validationConfig: {
                minCorrelationThreshold: parseFloat(process.env.MIN_CORRELATION_THRESHOLD || '0.7'),
                timestampAccuracyMinutes: parseInt(process.env.TIMESTAMP_ACCURACY_THRESHOLD_MINUTES || '30', 10),
                newsCoverageThreshold: parseFloat(process.env.NEWS_COVERAGE_THRESHOLD || '0.8')
            },
            
            // Stock Analysis
            defaultStockSymbols: (process.env.DEFAULT_STOCK_SYMBOLS || 'AAPL,MSFT,GOOGL').split(','),
            marketHoursStart: process.env.MARKET_HOURS_START || '09:30',
            marketHoursEnd: process.env.MARKET_HOURS_END || '16:00',
            timezone: process.env.TIMEZONE || 'America/New_York'
        };
    }

    private validateConfiguration(): void {
        const required = [
            'alphaVantageApiKey',
            'supabaseConfig.projectUrl',
            'supabaseConfig.apiKey',
            'airtableConfig.apiKey',
            'airtableConfig.baseId'
        ];

        for (const key of required) {
            const value = this.getNestedValue(this.config, key);
            if (!value) {
                logger.warn(`Missing required configuration: ${key}`);
            }
        }

        logger.info('Configuration loaded successfully', {
            nodeEnv: this.config.nodeEnv,
            port: this.config.port,
            hasSupabaseConfig: !!this.config.supabaseConfig.projectUrl,
            hasAirtableConfig: !!this.config.airtableConfig.apiKey,
            stockSymbols: this.config.defaultStockSymbols.length
        });
    }

    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    // Get full configuration (for debugging)
    public getFullConfig(): AppConfiguration {
        return { ...this.config };
    }

    // Check if we have valid Supabase configuration
    public hasValidSupabaseConfig(): boolean {
        return !!(this.config.supabaseConfig.projectUrl && this.config.supabaseConfig.apiKey);
    }

    // Check if we have valid Airtable configuration
    public hasValidAirtableConfig(): boolean {
        return !!(this.config.airtableConfig.apiKey && this.config.airtableConfig.baseId);
    }
}

export default AppConfig;

