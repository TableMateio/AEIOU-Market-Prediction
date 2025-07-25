import { Request, Response, NextFunction } from 'express';
import { createLogger } from './logger';

const logger = createLogger('ErrorHandler');

// Custom error classes
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly errorCode?: string;

    constructor(
        message: string,
        statusCode: number = 500,
        isOperational: boolean = true,
        errorCode?: string
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.errorCode = errorCode;

        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: any) {
        super(message, 400, true, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
    }
}

export class DataSourceError extends AppError {
    constructor(message: string, source: string, originalError?: Error) {
        super(`Data source error (${source}): ${message}`, 502, true, 'DATA_SOURCE_ERROR');
        this.name = 'DataSourceError';
    }
}

export class RateLimitError extends AppError {
    constructor(message: string = 'Rate limit exceeded') {
        super(message, 429, true, 'RATE_LIMIT_ERROR');
        this.name = 'RateLimitError';
    }
}

export class ConfigurationError extends AppError {
    constructor(message: string) {
        super(`Configuration error: ${message}`, 500, false, 'CONFIGURATION_ERROR');
        this.name = 'ConfigurationError';
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication failed') {
        super(message, 401, true, 'AUTHENTICATION_ERROR');
        this.name = 'AuthenticationError';
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string) {
        super(`${resource} not found`, 404, true, 'NOT_FOUND_ERROR');
        this.name = 'NotFoundError';
    }
}

// Error response interface
interface ErrorResponse {
    success: false;
    error: {
        message: string;
        code?: string;
        statusCode: number;
        timestamp: string;
        requestId?: string;
        details?: any;
        stack?: string;
    };
}

// Check if error is operational (safe to show to client)
const isOperationalError = (error: Error): boolean => {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
};

// Format error response
const formatErrorResponse = (
    error: Error,
    requestId?: string,
    includeStack: boolean = false
): ErrorResponse => {
    const response: ErrorResponse = {
        success: false,
        error: {
            message: error.message || 'Internal server error',
            statusCode: error instanceof AppError ? error.statusCode : 500,
            timestamp: new Date().toISOString(),
        },
    };

    // Add optional fields
    if (requestId) {
        response.error.requestId = requestId;
    }

    if (error instanceof AppError && error.errorCode) {
        response.error.code = error.errorCode;
    }

    if (includeStack && error.stack) {
        response.error.stack = error.stack;
    }

    return response;
};

// Main error handling middleware
export const errorHandler = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const requestId = req.headers['x-request-id'] as string;

    // Log the error
    const logMeta = {
        requestId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        error: error.message,
        stack: error.stack,
    };

    if (isOperationalError(error)) {
        logger.warn('Operational error occurred', logMeta);
    } else {
        logger.error('Unexpected error occurred', logMeta);
    }

    // Determine response details
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const includeStack = process.env.NODE_ENV === 'development';
    const showErrorDetails = isOperationalError(error) || process.env.NODE_ENV === 'development';

    // Format response
    const errorResponse = formatErrorResponse(
        showErrorDetails ? error : new Error('Internal server error'),
        requestId,
        includeStack
    );

    // Send error response
    res.status(statusCode).json(errorResponse);
};

// Async error wrapper for route handlers
export const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Global unhandled error handlers
export const setupGlobalErrorHandlers = (): void => {
    process.on('uncaughtException', (error: Error) => {
        logger.error('Uncaught Exception', {
            error: error.message,
            stack: error.stack,
        });

        // Give time for logs to flush then exit
        setTimeout(() => {
            process.exit(1);
        }, 1000);
    });

    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
        logger.error('Unhandled Rejection', {
            reason: reason instanceof Error ? reason.message : String(reason),
            stack: reason instanceof Error ? reason.stack : undefined,
        });

        // For unhandled rejections, we don't exit the process immediately
        // but we should monitor these closely
    });
};

// Helper function to create and throw common errors
export const throwError = {
    validation: (message: string, details?: any): never => {
        throw new ValidationError(message, details);
    },
    notFound: (resource: string): never => {
        throw new NotFoundError(resource);
    },
    dataSource: (message: string, source: string, originalError?: Error): never => {
        throw new DataSourceError(message, source, originalError);
    },
    rateLimit: (message?: string): never => {
        throw new RateLimitError(message);
    },
    configuration: (message: string): never => {
        throw new ConfigurationError(message);
    },
    authentication: (message?: string): never => {
        throw new AuthenticationError(message);
    },
}; 