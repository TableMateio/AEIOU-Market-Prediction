import type { NewsServiceInterface } from './interfaces/newsServiceInterface.js';
import { finlightService } from './finlightService.js';
// import { newsApiAiService } from './newsApiAiService.js'; // Keep as backup

export type NewsProvider = 'finlight' | 'eventregistry';

/**
 * Factory for creating news service instances
 * Allows easy switching between providers
 */
export class NewsServiceFactory {
    private static instance: NewsServiceFactory;
    private currentProvider: NewsProvider = 'finlight';
    private services: Map<NewsProvider, NewsServiceInterface> = new Map();

    constructor() {
        // Initialize available services
        this.services.set('finlight', finlightService);
        // this.services.set('eventregistry', newsApiAiService); // Keep as backup
    }

    static getInstance(): NewsServiceFactory {
        if (!NewsServiceFactory.instance) {
            NewsServiceFactory.instance = new NewsServiceFactory();
        }
        return NewsServiceFactory.instance;
    }

    /**
     * Get the current active news service
     */
    getCurrentService(): NewsServiceInterface {
        const service = this.services.get(this.currentProvider);
        if (!service) {
            throw new Error(`News service '${this.currentProvider}' not available`);
        }
        return service;
    }

    /**
     * Switch to a different news provider
     */
    switchProvider(provider: NewsProvider): void {
        if (!this.services.has(provider)) {
            throw new Error(`News service '${provider}' not available`);
        }
        this.currentProvider = provider;
    }

    /**
     * Get current provider name
     */
    getCurrentProviderName(): string {
        return this.currentProvider;
    }

    /**
     * Test all available services and return status
     */
    async testAllServices(): Promise<Record<string, any>> {
        const results: Record<string, any> = {};
        
        for (const [name, service] of this.services.entries()) {
            try {
                const testResult = await service.testConnection();
                results[name] = testResult;
            } catch (error: any) {
                results[name] = {
                    success: false,
                    message: `Failed to test ${name}: ${error.message}`
                };
            }
        }
        
        return results;
    }

    /**
     * Get capabilities of current service
     */
    async getCurrentServiceCapabilities(): Promise<any> {
        const service = this.getCurrentService();
        if ('getCapabilities' in service && typeof service.getCapabilities === 'function') {
            return await (service as any).getCapabilities();
        }
        return null;
    }
}

// Export singleton instance
export const newsServiceFactory = NewsServiceFactory.getInstance();
