import winston from 'winston';
import { AppConfig } from '@config/app';

const config = AppConfig.getInstance();

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

const transports: winston.transport[] = [
    new winston.transports.Console({
        format: config.logFormat === 'json' ? prodFormat : devFormat,
    }),
];

// Add file transport in production
if (config.environment === 'production') {
    transports.push(
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: prodFormat,
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            format: prodFormat,
        })
    );
}

const baseLogger = winston.createLogger({
    level: config.logLevel,
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

// Performance logging helper
export function logPerformance<T>(
    logger: Logger,
    operation: string,
    fn: () => T,
    meta: LoggerMeta = {}
): T {
    const start = Date.now();
    logger.debug(`Starting ${operation}`, meta);

    try {
        const result = fn();
        const duration = Date.now() - start;
        logger.info(`Completed ${operation}`, { ...meta, duration });
        return result;
    } catch (error) {
        const duration = Date.now() - start;
        logger.error(`Failed ${operation}`, {
            ...meta,
            duration,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
    }
}

// Async performance logging helper
export async function logPerformanceAsync<T>(
    logger: Logger,
    operation: string,
    fn: () => Promise<T>,
    meta: LoggerMeta = {}
): Promise<T> {
    const start = Date.now();
    logger.debug(`Starting ${operation}`, meta);

    try {
        const result = await fn();
        const duration = Date.now() - start;
        logger.info(`Completed ${operation}`, { ...meta, duration });
        return result;
    } catch (error) {
        const duration = Date.now() - start;
        logger.error(`Failed ${operation}`, {
            ...meta,
            duration,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
    }
} 