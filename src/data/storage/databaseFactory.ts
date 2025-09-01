/**
 * Database Factory - Creates appropriate database instance based on configuration
 * 
 * Allows easy switching between Airtable and Supabase through environment variables
 */

import { AppConfig } from '@config/app';
import { createLogger } from '@utils/logger';
import { DatabaseInterface, DatabaseProvider } from './databaseInterface';
import { AirtableStorage } from './airtable';
import SupabaseStorage from './supabase';

const logger = createLogger('DatabaseFactory');

export class DatabaseFactory {
    private static instance: DatabaseInterface;
    private static currentProvider: DatabaseProvider;

    /**
     * Create database synchronously (for immediate use)
     */
    public static create(provider?: DatabaseProvider): DatabaseInterface {
        const selectedProvider = provider || this.determineProvider();

        if (this.instance && this.currentProvider === selectedProvider) {
            return this.instance;
        }

        logger.info(`Creating database instance: ${selectedProvider}`);

        switch (selectedProvider) {
            case 'supabase':
                this.instance = SupabaseStorage.getInstance();
                break;
            case 'airtable':
            default:
                this.instance = AirtableStorage.getInstance();
                break;
        }

        this.currentProvider = selectedProvider;
        return this.instance;
    }

    public static async createDatabase(provider?: DatabaseProvider): Promise<DatabaseInterface> {

        // Use provided provider or determine from environment
        const selectedProvider = provider || this.determineProvider();

        // Return existing instance if same provider
        if (this.instance && this.currentProvider === selectedProvider) {
            return this.instance;
        }

        logger.info(`Creating database instance: ${selectedProvider}`);

        switch (selectedProvider) {
            case 'supabase':
                this.instance = SupabaseStorage.getInstance();
                break;
            case 'airtable':
            default:
                this.instance = AirtableStorage.getInstance();
                break;
        }

        this.currentProvider = selectedProvider;

        // Initialize the database
        await this.instance.initialize();

        logger.info(`Database initialized: ${selectedProvider}`);
        return this.instance;
    }

    private static determineProvider(): DatabaseProvider {

        // Check if Supabase credentials are available
        try {
            const config = AppConfig.getInstance();
            const supabaseConfig = config.supabaseConfig;
            if (supabaseConfig.projectUrl && supabaseConfig.apiKey) {
                logger.info('Supabase credentials found, using Supabase');
                return 'supabase';
            }
        } catch (error) {
            logger.info('Supabase credentials not available, falling back to Airtable');
        }

        // Fallback to Airtable
        return 'airtable';
    }

    public static getCurrentProvider(): DatabaseProvider | undefined {
        return this.currentProvider;
    }

    public static async getInstance(): Promise<DatabaseInterface> {
        if (!this.instance) {
            return await this.createDatabase();
        }
        return this.instance;
    }

    // Force recreation with specific provider (useful for migration)
    public static async switchProvider(provider: DatabaseProvider): Promise<DatabaseInterface> {
        logger.info(`Switching database provider to: ${provider}`);
        this.instance = undefined as any;
        this.currentProvider = undefined as any;
        return await this.createDatabase(provider);
    }
}

export default DatabaseFactory;
