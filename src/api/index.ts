import { Router } from 'express';
import { createLogger } from '@utils/logger';

const logger = createLogger('API');
export const apiRouter = Router();

// API status endpoint
apiRouter.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'AEIOU Market Prediction API v1',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            config: '/config',
            // TODO: Add more endpoints as we build them
            // data: '/data',
            // analysis: '/analysis',
            // validation: '/validation',
        },
    });
});

// Configuration endpoint (for debugging/monitoring)
apiRouter.get('/config', (req, res) => {
    // Only show non-sensitive config in development
    if (process.env.NODE_ENV === 'development') {
        res.json({
            success: true,
            config: {
                environment: process.env.NODE_ENV,
                logLevel: process.env.LOG_LEVEL || 'info',
                // Add other non-sensitive config as needed
            },
        });
    } else {
        res.status(403).json({
            success: false,
            error: {
                message: 'Configuration endpoint not available in production',
                code: 'FORBIDDEN',
                statusCode: 403,
            },
        });
    }
});

// Placeholder for future route modules
// TODO: Add these as we build the features
// import { dataRoutes } from './data';
// import { analysisRoutes } from './analysis';
// import { validationRoutes } from './validation';

// apiRouter.use('/data', dataRoutes);
// apiRouter.use('/analysis', analysisRoutes);
// apiRouter.use('/validation', validationRoutes);

logger.info('API routes initialized');

export default apiRouter; 