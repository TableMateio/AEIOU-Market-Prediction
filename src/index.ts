import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createLogger } from '@utils/logger';
import { AppConfig } from '@config/app';
import { errorHandler, setupGlobalErrorHandlers } from '@utils/errorHandler';
import { apiRouter } from '@api/index';
import AirtableStorage from '@data/storage/airtable';
import AlphaVantageClient from '@data/sources/alphaVantage';

// Load environment variables
dotenv.config();

// Setup global error handlers
setupGlobalErrorHandlers();

const logger = createLogger('Main');
const config = AppConfig.getInstance();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/v1', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: config.environment,
    });
});

// Error handling middleware
app.use(errorHandler);

const PORT = config.port;

// Initialize services
async function initializeServices(): Promise<void> {
    try {
        logger.info('Initializing services...');

        // Initialize Airtable storage
        const airtableStorage = AirtableStorage.getInstance();
        await airtableStorage.initializeTables();

        // Test Alpha Vantage connection
        const alphaVantageClient = AlphaVantageClient.getInstance();
        const apiStatus = await alphaVantageClient.checkApiStatus();

        if (!apiStatus.healthy) {
            logger.error('Alpha Vantage API is not healthy', { status: apiStatus });
        } else {
            logger.info('Alpha Vantage API connection verified', { rateLimitInfo: apiStatus.rateLimitInfo });
        }

        logger.info('All services initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize services', { error });
        throw error;
    }
}

// Start the server
async function startServer(): Promise<void> {
    try {
        await initializeServices();

        app.listen(PORT, () => {
            logger.info(`AEIOU Market Prediction Engine started on port ${PORT}`, {
                environment: config.environment,
                port: PORT,
            });
        });
    } catch (error) {
        logger.error('Failed to start server', { error });
        process.exit(1);
    }
}

// Start the application
startServer().catch((error) => {
    logger.error('Application startup failed', { error });
    process.exit(1);
});

export default app; 