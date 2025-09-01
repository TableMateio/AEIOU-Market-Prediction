import winston from 'winston';

// Use environment variables directly to avoid circular dependency
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FORMAT = process.env.LOG_FORMAT || 'simple';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Custom log format for development
const devFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${service || 'APP'}] ${level}: ${message} ${metaStr}`;
    })
);

// JSON format for production
const prodFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Configure transports
const transports = [
    new winston.transports.Console({
        format: NODE_ENV === 'production' ? prodFormat : devFormat,
    }),
];

// Add file transport in production
if (NODE_ENV === 'production') {
    transports.push(
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: prodFormat,
        }) as any,
        new winston.transports.File({
            filename: 'logs/combined.log',
            format: prodFormat,
        }) as any
    );
}

const baseLogger = winston.createLogger({
    level: LOG_LEVEL,
    transports,
    exitOnError: false,
});

export interface LoggerMeta {
    [key: string]: any;
    userId?: string;
    requestId?: string;
    stockSymbol?: string;
    eventType?: string;
    duration?: number;
    correlationId?: string;
}

export interface Logger {
    error(message: string, meta?: LoggerMeta): void;
    warn(message: string, meta?: LoggerMeta): void;
    info(message: string, meta?: LoggerMeta): void;
    debug(message: string, meta?: LoggerMeta): void;
}

export function createLogger(service: string): Logger {
    return {
        error: (message: string, meta: LoggerMeta = {}): void => {
            baseLogger.error(message, { service, ...meta });
        },
        warn: (message: string, meta: LoggerMeta = {}): void => {
            baseLogger.warn(message, { service, ...meta });
        },
        info: (message: string, meta: LoggerMeta = {}): void => {
            baseLogger.info(message, { service, ...meta });
        },
        debug: (message: string, meta: LoggerMeta = {}): void => {
            baseLogger.debug(message, { service, ...meta });
        },
    };
}

// Export a default logger
export const logger = createLogger('AEIOU');

// Utility functions for structured logging
export const logApiCall = (api: string, endpoint: string, duration: number, success: boolean, meta: LoggerMeta = {}) => {
    const message = `API ${api} ${endpoint} ${success ? 'SUCCESS' : 'FAILED'} in ${duration}ms`;
    const logMeta = { api, endpoint, duration, success, ...meta };

    if (success) {
        logger.info(message, logMeta);
    } else {
        logger.error(message, logMeta);
    }
};

export const logValidation = (type: string, result: boolean, details: any, meta: LoggerMeta = {}) => {
    const message = `Validation ${type} ${result ? 'PASSED' : 'FAILED'}`;
    const logMeta = { validationType: type, result, details, ...meta };

    if (result) {
        logger.info(message, logMeta);
    } else {
        logger.warn(message, logMeta);
    }
};

export const logPhaseProgress = (phase: string, step: string, progress: number, meta: LoggerMeta = {}) => {
    const message = `Phase ${phase} - ${step} (${progress}% complete)`;
    logger.info(message, { phase, step, progress, ...meta });
};

export const logMarketEvent = (symbol: string, eventType: string, impact: string, meta: LoggerMeta = {}) => {
    const message = `Market Event: ${symbol} ${eventType} - ${impact}`;
    logger.info(message, { stockSymbol: symbol, eventType, impact, ...meta });
};

// Performance monitoring
export const withTiming = async <T>(
    operation: string,
    fn: () => Promise<T>,
    meta: LoggerMeta = {}
): Promise<T> => {
    const start = Date.now();
    try {
        const result = await fn();
        const duration = Date.now() - start;
        logger.info(`Operation ${operation} completed in ${duration}ms`, { operation, duration, success: true, ...meta });
        return result;
    } catch (error) {
        const duration = Date.now() - start;
        logger.error(`Operation ${operation} failed after ${duration}ms`, { operation, duration, success: false, error: error instanceof Error ? error.message : String(error), ...meta });
        throw error;
    }
};