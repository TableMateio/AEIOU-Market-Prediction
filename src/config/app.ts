import Joi from 'joi';

interface IAppConfig {
    environment: 'development' | 'production' | 'test';
    port: number;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    logFormat: 'json' | 'simple';
}

interface IApiConfig {
    alphaVantage: {
        apiKey: string;
        baseUrl: string;
        rateLimitWindowMs: number;
        rateLimitMaxRequests: number;
    };
    yahooFinance: {
        apiKey?: string;
        baseUrl: string;
    };
}

interface IAirtableConfig {
    apiKey: string;
    baseId: string;
    tables: {
        newsEvents: string;
        stockData: string;
        causalChains: string;
        validationResults: string;
    };
}

interface IValidationConfig {
    minCorrelationThreshold: number;
    timestampAccuracyThresholdMinutes: number;
    newsCoverageThreshold: number;
}

interface IStockAnalysisConfig {
    defaultStockSymbols: string[];
    marketHours: {
        start: string;
        end: string;
        timezone: string;
    };
}

// Validation schema for environment variables
const envSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().port().default(3000),

    // API Keys
    ALPHA_VANTAGE_API_KEY: Joi.string().required(),
    YAHOO_FINANCE_API_KEY: Joi.string().optional(),

    // Airtable
    AIRTABLE_API_KEY: Joi.string().required(),
    AIRTABLE_BASE_ID: Joi.string().required(),

    // Rate Limiting
    API_RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
    API_RATE_LIMIT_MAX_REQUESTS: Joi.number().default(25),

    // Logging
    LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
    LOG_FORMAT: Joi.string().valid('json', 'simple').default('json'),

    // Validation Thresholds
    MIN_CORRELATION_THRESHOLD: Joi.number().min(0).max(1).default(0.7),
    TIMESTAMP_ACCURACY_THRESHOLD_MINUTES: Joi.number().default(30),
    NEWS_COVERAGE_THRESHOLD: Joi.number().min(0).max(1).default(0.8),

    // Stock Analysis
    DEFAULT_STOCK_SYMBOLS: Joi.string().default('AAPL,MSFT,GOOGL'),
    MARKET_HOURS_START: Joi.string().default('09:30'),
    MARKET_HOURS_END: Joi.string().default('16:00'),
    TIMEZONE: Joi.string().default('America/New_York'),
}).unknown();

export class AppConfig {
    private static instance: AppConfig;
    private readonly config: {
        app: IAppConfig;
        api: IApiConfig;
        airtable: IAirtableConfig;
        validation: IValidationConfig;
        stockAnalysis: IStockAnalysisConfig;
    };

    private constructor() {
        const { error, value: envVars } = envSchema.validate(process.env);

        if (error) {
            throw new Error(`Config validation error: ${error.message}`);
        }

        this.config = {
            app: {
                environment: envVars.NODE_ENV,
                port: envVars.PORT,
                logLevel: envVars.LOG_LEVEL,
                logFormat: envVars.LOG_FORMAT,
            },
            api: {
                alphaVantage: {
                    apiKey: envVars.ALPHA_VANTAGE_API_KEY,
                    baseUrl: 'https://www.alphavantage.co/query',
                    rateLimitWindowMs: envVars.API_RATE_LIMIT_WINDOW_MS,
                    rateLimitMaxRequests: envVars.API_RATE_LIMIT_MAX_REQUESTS,
                },
                yahooFinance: {
                    apiKey: envVars.YAHOO_FINANCE_API_KEY,
                    baseUrl: 'https://yfapi.net',
                },
            },
            airtable: {
                apiKey: envVars.AIRTABLE_API_KEY,
                baseId: envVars.AIRTABLE_BASE_ID,
                tables: {
                    newsEvents: 'News Events',
                    stockData: 'Stock Data',
                    causalChains: 'Causal Chains',
                    validationResults: 'Validation Results',
                },
            },
            validation: {
                minCorrelationThreshold: envVars.MIN_CORRELATION_THRESHOLD,
                timestampAccuracyThresholdMinutes: envVars.TIMESTAMP_ACCURACY_THRESHOLD_MINUTES,
                newsCoverageThreshold: envVars.NEWS_COVERAGE_THRESHOLD,
            },
            stockAnalysis: {
                defaultStockSymbols: envVars.DEFAULT_STOCK_SYMBOLS.split(',').map((s: string) => s.trim()),
                marketHours: {
                    start: envVars.MARKET_HOURS_START,
                    end: envVars.MARKET_HOURS_END,
                    timezone: envVars.TIMEZONE,
                },
            },
        };
    }

    public static getInstance(): AppConfig {
        if (!AppConfig.instance) {
            AppConfig.instance = new AppConfig();
        }
        return AppConfig.instance;
    }

    // Getters for different config sections
    public get environment(): 'development' | 'production' | 'test' {
        return this.config.app.environment;
    }

    public get port(): number {
        return this.config.app.port;
    }

    public get logLevel(): string {
        return this.config.app.logLevel;
    }

    public get logFormat(): string {
        return this.config.app.logFormat;
    }

    public get apiConfig(): IApiConfig {
        return this.config.api;
    }

    public get airtableConfig(): IAirtableConfig {
        return this.config.airtable;
    }

    public get validationConfig(): IValidationConfig {
        return this.config.validation;
    }

    public get stockAnalysisConfig(): IStockAnalysisConfig {
        return this.config.stockAnalysis;
    }

    // Method to get all config (useful for debugging)
    public getAllConfig(): typeof this.config {
        return { ...this.config };
    }
} 